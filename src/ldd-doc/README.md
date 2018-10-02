[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

pds-ldd-doc
==========================
Generate documentation for an PDS4 LDD.

Read and LDD specification file and generate documentation in Github Flavored
Markdown.

## Usage

```
ldd-doc.js [args] <files...>
```

## Options

<dl>
  <dt>--version</dt><dd>Show version number                                      [boolean]</dd>
  <dt>-h, --help</dt><dd>Show information about the app.                          [boolean]</dd>
</dl>

## Examples

Generate documentation for the LDD specification in the file "example.xml"

``` 
  pds-ldd-doc example.xml
```

## License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

[http://www.apache.org/licenses/LICENSE-2.0](https://opensource.org/licenses/Apache-2.0)

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
 limitations under the License.