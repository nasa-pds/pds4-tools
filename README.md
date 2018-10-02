

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)
[![npm version](https://badge.fury.io/js/pds4-tools.svg)](https://badge.fury.io/js/pds4-tools)
[![npm](https://img.shields.io/npm/dt/pds4-tools.svg)](https://www.npmjs.com/package/pds4-tools)

PDS4 Tools
==========================

Tools to generate and use PDS4 metadata.

## Installation

  `npm install pds4-tools -g`
  
## Tools

[pds-collection-builder](src/collection-builder) : Extract information from a PDS4 labels in a directory and generate a collection inventory. Optionally update a collection label with information harvested from the data products. 

[pds-doi-request](src/doi-request) : Extract information from a PDS4 label and generate an DOI request which can be used with Interagency Data (IAD) web services.

[pds-ldd-doc](src/ldd-doc) : Generate Github Flavored Markdown (GFM) documentation for a Local Data Dictionary (LDD) specification file. Suitable for use as a README.md for the LDD.

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
