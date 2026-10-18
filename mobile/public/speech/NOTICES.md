# Local speech recognition attribution

- Runtime: sherpa-onnx / Next-gen Kaldi, k2-fsa contributors, Apache-2.0.
  Pinned binary release: https://github.com/k2-fsa/sherpa-onnx/releases/tag/v1.12.9
  License: licenses/sherpa-onnx-APACHE-2.0.txt
- Recognition model: SenseVoiceSmall, FunAudioLLM / FunASR, Alibaba Group.
  Original model name: sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17.
  Model information: https://github.com/FunAudioLLM/SenseVoice
  Model license: FunASR Model Open Source License Agreement v1.1.
  License text: licenses/SenseVoiceSmall-MODEL-LICENSE.txt
- The official sherpa-onnx bundle also contains silero_vad.onnx. This application does not invoke it;
  its pause feedback uses a separately documented energy heuristic.
  Silero VAD: https://github.com/snakers4/silero-vad (MIT).
- The WebAssembly bundle contains ONNX Runtime (Microsoft, MIT), kaldi-native-fbank and
  sherpa-onnx dependencies; their bundled software is provided under its respective upstream licenses.

The model only produces a transcript. Text matching is labeled reading completeness and is never
represented as phonetic accuracy, pronunciation diagnosis, or a Mandarin proficiency certificate.
