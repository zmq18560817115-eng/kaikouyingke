"""Regenerate bundled Mandarin demonstrations with sherpa-onnx + MeloTTS (MIT).

Developer tool only. Requires sherpa-onnx==1.12.26, soundfile==0.13.1,
the official vits-melo-tts-zh_en model, and macOS afconvert for AAC encoding.
The recognizer distributed to clients is separate and pinned to v1.12.9.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

import sherpa_onnx
import soundfile as sf

root = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser()
parser.add_argument('--model', type=Path, default=root / '.work/local-speech/vits-melo-tts-zh_en')
args = parser.parse_args()
model = args.model.resolve()
vits = sherpa_onnx.OfflineTtsVitsModelConfig(
    model=str(model / 'model.onnx'), lexicon=str(model / 'lexicon.txt'),
    tokens=str(model / 'tokens.txt'), dict_dir=str(model / 'dict'),
)
config = sherpa_onnx.OfflineTtsConfig(
    model=sherpa_onnx.OfflineTtsModelConfig(vits=vits, num_threads=2, debug=False),
    rule_fsts=','.join(str(model / f) for f in ['date.fst', 'number.fst', 'phone.fst']),
    max_num_sentences=1,
)
tts = sherpa_onnx.OfflineTts(config)
output = root / 'src/static/audio'
output.mkdir(exist_ok=True)
temporary = root / '.work/local-speech/demo-wavs'
temporary.mkdir(exist_ok=True)
manifest = json.loads((root / 'src/data/demo-audio.json').read_text())
reports = []
for text, name in manifest.items():
    for suffix, speed in [('', 1.0), ('-slow', .72)]:
        audio = tts.generate(text, sid=0, speed=speed)
        wav = temporary / (name + suffix + '.wav')
        sf.write(str(wav), audio.samples, audio.sample_rate, subtype='PCM_16')
        path = output / (name + suffix + '.m4a')
        subprocess.run(['afconvert', '-f', 'm4af', '-d', 'aac@16000', '-c', '1', '-b', '32000', str(wav), str(path)], check=True)
        reports.append({'file': path.name, 'text': text, 'speed': speed, 'seconds': round(len(audio.samples) / audio.sample_rate, 2), 'sha256': hashlib.sha256(path.read_bytes()).hexdigest()})
        print(path.name, reports[-1]['seconds'], flush=True)
(output / 'provenance.json').write_text(json.dumps({'generator': 'sherpa-onnx 1.12.26', 'model': 'vits-melo-tts-zh_en / myshell-ai/MeloTTS-Chinese', 'model_source': 'https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-melo-tts-zh_en.tar.bz2', 'model_license': 'MIT (MyShell.ai)', 'note': '普通话合成示范，未代替真人校审。', 'files': reports}, ensure_ascii=False, indent=2) + '\n')
