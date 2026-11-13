# Third-Party Notices

ScholarLoom's [MIT license](LICENSE) applies to this project's original source
code. It does not replace the licenses of third-party components.

## Runtime dependencies

The versions below are pinned by `requirements.txt`. In the current audit
environment, PyMuPDF is 1.27.2.3; CTranslate2 and SentencePiece are not
installed, so their real translation engine was not exercised locally.

| Component | Version | License | Local license text |
| --- | --- | --- | --- |
| [PyMuPDF](https://pymupdf.readthedocs.io/) | 1.27.2.3 | GNU AGPL-3.0 or Artifex Commercial License | [AGPL-3.0.txt](licenses/AGPL-3.0.txt) |
| [CTranslate2](https://github.com/OpenNMT/CTranslate2) | 4.8.5 | MIT | [CTranslate2-LICENSE.txt](licenses/CTranslate2-LICENSE.txt) |
| [SentencePiece](https://github.com/google/sentencepiece) | 0.2.3 | Apache-2.0 | [SentencePiece-LICENSE.txt](licenses/SentencePiece-LICENSE.txt) |

PyMuPDF is distributed under a dual license. Users who redistribute
ScholarLoom with PyMuPDF, or otherwise cannot satisfy the GNU AGPL, must obtain
the applicable Artifex commercial license.

## Bundled browser component

| Component | Version | License | Local license text |
| --- | --- | --- | --- |
| [PDF.js](https://github.com/mozilla/pdf.js) | 5.4.394 | Apache-2.0 | [PDF.js-LICENSE.txt](licenses/PDF.js-LICENSE.txt) |

The PDF.js character maps under `web/vendor/pdfjs/cmaps/` retain the notices
provided in their [LICENSE](web/vendor/pdfjs/cmaps/LICENSE).
