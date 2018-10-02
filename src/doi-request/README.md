[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](https://opensource.org/licenses/Apache-2.0)

pds-doi-request
==========================

Extract information from a PDS4 label and generate an DOI request which can be
used with Interagency Data (IAD) web services.

## Installation
"pds-doi-request" is part of the "pds4-tools" package and can be installed with from NPM.

```
npm install pds4-tools -g
```

## Usage

```
pds-doi-request [args] <files...>
```

## Options

<dl>
  <dt>--version</dt><dd>Show version number                              [boolean]</dd>
  <dt>-h, --help</dt><dd>Show information about the app.                  [boolean]</dd>
  <dt>-c, --collection</dt><dd>Submit as a collection. Use for document collection, but
                      not for data or borwse collections.</dd>
  <dt>-r, --reserve</dt><dd>Reserve generated DOI and do not publically release
                      immeadiately.</dd>
  <dt>-u, --author</dt><dd>Author list. Separate names with semi-colon. Names are
                      first, last[, middle]               [string] [default: ""]</dd>
  <dt>-p, --publisher</dt><dd>Name of the publisher.
                        [string] [default: "NASA's Planetary Data System (PDS)"]</dd>
  <dt>-s, --sponsor</dt><dd>Name of the sponsor organization.
      [string] [default: "National Aeronautics and Space Administration (NASA)"]</dd>
  <dt>-n, --name</dt><dd>Contact name.           [string] [default: "PDS Operator"]</dd>
  <dt>-o, --organization</dt><dd>Name of the contact organization.
                               [string] [default: "Planetary Data System (PDS)"]</dd>
  <dt>-e, --email</dt><dd>Contact email address.
                                 [string] [default: "pds-operator@jpl.nasa.gov"]</dd>
  <dt>-t, --phone</dt><dd>Contact telephone number.
                                              [string] [default: "818.393.7165"]</dd>
  <dt>-a, --availability</dt><dd>The name of any office or organization that can offer
                      additional help in obtaining or utilizing the dataset.
                                                    [string] [default: "NSSDCA"]</dd>
  <dt>-l, --landing</dt><dd>The landing page URL.                   [string] [default:
        "https://pds.jpl.nasa.gov/ds-view/pds/viewCollection.jsp?identifier=%s"]</dd>
  <dt>-d, --date</dt><dd>Publication date (YYYY-MM-DD).      [string] [default: ""]</dd>
  <dt>-b, --contrib</dt><dd>Contributor organization.
              [string] [default: "PDS Planetary Plasma Interactions (PPI) Node"]</dd>
</dl>

## Examples

 Generate a DOI request for PDS4 label in the file "example.xml"
 
```
  pds-doi-request example.xml
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