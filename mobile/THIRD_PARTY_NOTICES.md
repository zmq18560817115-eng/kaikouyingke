# 第三方素材

Phosphor Icons / @phosphor-icons/core 2.1.1

图标由官方 SVG 转为本地 PNG，保留以下许可证。插画素材说明见 ../assets/README.md。

```text
MIT License

Copyright (c) 2023 Phosphor Icons

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

```

## 0.3.0 本机语音练习

本机文字识别使用 sherpa-onnx v1.12.9（Next-gen Kaldi / k2-fsa，Apache-2.0）及 SenseVoiceSmall（FunAudioLLM / FunASR / Alibaba Group，FunASR Model Open Source License Agreement v1.1）。原模型名称 sherpa-onnx-sense-voice-zh-en-ja-ko-yue-int8-2024-07-17 保留在交付说明与署名中。运行包包括 ONNX Runtime（MIT）、kaldi-native-fbank（Apache-2.0）和未启用的 Silero VAD（MIT）。随站点分发的许可证位于 public/speech/licenses，详见 public/speech/NOTICES.md。

普通话合成示范由 sherpa-onnx 1.12.26 与 MyShell.ai 的 vits-melo-tts-zh_en / MeloTTS-Chinese 模型（MIT）生成。未使用操作系统受限声音制作可分发音频。原文、语速、时长及文件哈希见 src/static/audio/provenance.json；模型许可证随 src/static/audio/licenses/MeloTTS-MIT.txt 分发。音频为合成示范，尚未替代真人教学校审。
