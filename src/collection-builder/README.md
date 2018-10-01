pds-collection-builder
==========================
Build a collection index file.

Extract information from a PDS4 labels in a directory and generate a collection
inventory. If supplied an existing collection label the label will be updated to
match the generated collection inventory file information.

## Installation
"pds-doi-request" is part of the "pds4-tools" package and can be installed with from NPM.

```
npm install pds4-tools -g
```

## Usage

```
pds-collection-builder [args] <directory>
```

## Options

<dl>
  <dt>--version</dt><dd>Show version number                                [boolean]</dd>
  <dt>-h, --help</dt><dd>Show information about the app.                    [boolean]</dd>
  <dt>-v, --verbose</dt><dd>Show progress and other performance information.   [boolean]</dd>
  <dt>-i, --id</dt><dd>Collection ID for the inventory.      [string] [default: ""]</dd>
  <dt>-c, --collection</dt><dd>File name of the collection label.    [string] [default: ""]</dd>
  <dt>-o, --output</dt><dd>Output file name for collection inventory.
                                                          [string] [default: ""]</dd>
</dl>

## Examples

Generate a collection index for products in the current directory and write inventory in "inventory.csv".

```
  pds-collection-builder -o inventory.csv .
```

Update a collection product label with a fresh generation of a collection index. The collection ID in the collection label will be used to determine which products to include in the collection inventory. The collection index will be written into the file referenced in the collection label. 

```
  pds-collection-builder -c collection.lbl .
```

## License

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

       [http://www.apache.org/licenses/LICENSE-2.0]

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
 limitations under the License.