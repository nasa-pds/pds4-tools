#!/usr/bin/env node
"use strict";
/*eslint-disable no-console*/
/**
 * Build a PDS4 Collection inventory file.
 *
 * Extract information from a PDS4 label and generate a PDS4 collection inventory.
 * 
 * @author Todd King
 **/
const fs = require('fs');
const yargs = require('yargs');
const path = require('path');
const fastXmlParser = require('fast-xml-parser');
const XMLEngine = require('fast-xml-parser').j2xParser;
const readlines = require('n-readlines');
const util = require('util');
const walk = require('walk');
const crypt = require('crypto');

// Configure the app
var options  = yargs
	.version('1.0.0')
	.usage('Build a collection index file.\n\nExtract information from a PDS4 labels in a directory and generate a collection inventory. If supplied an existing collection label the label will be updated to match the generated collection inventory file information.\n\nUsage:\n\npds-collection-builder [args] <directory>')
	.example('$0 -o inventory.csv .', 'generate a collection index for products in the current directory and write inventory in "inventory.csv"')
	.epilog("Development funded by NASA's PDS project at UCLA.")
	.showHelpOnFail(false, 'Specify --help for available options')
	.help('h')
	
	// version
	.options({
		// help text
		'h' : {
			alias : 'help',
			description: 'Show information about the app.'
		},		
	
		// Verbose
		'v' : {
			alias : 'verbose',
			description: 'Show progress and other performance information.',
			type: 'boolean'			
		},

		// Collection ID
		'i' : {
			alias : 'id',
			description: 'Collection ID for the inventory.',
			type: 'string',
			default: ""
		},

		// Collection label file
		'c' : {
			alias : 'collection',
			description: 'File name of the collection label.',
			type: 'string',
			default: ""
		},

		// Output file
		'o' : {
			alias : 'output',
			description: 'Output file name for collection inventory.',
			type: 'string',
			default: ""
		},

	})
	.argv
	;

var args = options._;	// Remaining non-hyphenated arguments

/**
 * Check if two items are the same.
 * 
 * Inspects two objects and compares values. Objects can be of mixed type (array, string, objects)
 **/
var isSame = function(item1, item2) {
	if( item1.constructor === Object
	&&  item2.constructor === Object ) {
		// item1 and item2 are objects
		// console.log('Checking objects');
		var keys1 = Object.keys(item1);
		var keys2 = Object.keys(item2);
		
		if( ! isSame(keys1, keys2) ) return false;	// Not same structure
		
		// console.log('Objects have same elements');
		
		// Compare each element
		for(i = 0; i < keys1.length; i++) {
			if( ! isSame( item1[keys1[i]], item2[keys1[i]] ) ) return false;
		}
		
		return true;	// The objects are the same
	}
	
	// If item1 is an array and item2 is an array check if all values in item2 are in item1
	if( Array.isArray(item1) && Array.isArray(item2)) {
		// console.log('Checking array values');
		for(var i = 0; i < item2.length; i++) {
			if( ! isSame(item1, item2[i])) return false; // Lists are different
		}
		return true;	// Lists are the same
	}
	
	
	// If item1 is an array and item2 is a value check if value in array
	if( Array.isArray(item1) && ! Array.isArray(item2)) {
		// console.log('Checking array membership');
		for(var i = 0; i < item1.length; i++) {
			if(isSame(item1[i], item2)) return true;	// item2 is in list
		}
		return false;	// Not in list
	}
	
	// If item1 is a value and item2 is a value check if values are equal
	// console.log('Checking values: ' + item1 + ' ?= ' + item2);
	return (item1 == item2);
}

/** 
 * Coerce an item to an array if its not already.
 *
 **/
var asArray = function(item) {
	if( ! item) return [];	// Empty array
	if( ! Array.isArray(item)) { var t = []; t.push(item); item = t; }	// Coerce to array
	return item;
}

/** 
 * Merge two arrays into a unique list.
 *
 **/
var mergeArray = function(list1, list2) {
	if( ! Array.isArray(list1) && ! Array.isArray(list2)) return [];	// If neither a list return empty list
	if( ! Array.isArray(list1) ) return list2; // if list1 not, return list2
	if( ! Array.isArray(list2)) return list1;	// if list2 not, return list1

	// Merge lists
	for(var i = 0; i < list2.length; i++) {
		if( ! isSame(list1, list2[i]) ) { list1.push(list2[i]); }
	}
	
	return list1;	// Merged list
}

var main = function(args)
{
	var pathname = ".";
	var cnt = 0;
	var records = 0;

	if(args.length > 0) { pathname = args[0]; }
	if(options.verbose) { console.log('Processing: ' + pathname); }

	// var options = {ext :  ".xml", recurse: true};
	var walkOptions = {
		followLinks: false
	};

	var start = Date.now();
	var stamp = new Date(start);
	if(options.verbose) console.log("Start: " + stamp.toUTCString());

	var collectionLabel = null;
	var labelHeader = "";
	
	if(options.collection.length > 0) {	// Parse label - extract LID and inventory file name
		var filename = path.normalize(options.collection);
	   	var xmlDoc = fs.readFileSync(filename, 'utf8');
		// console.log(xmlDoc);
		var content = fastXmlParser.parse(xmlDoc, {    
			ignoreAttributes : false
		});
		var collectionLabel = content;

		var product = Object.keys(content)[0];
		if( product != 'Product_Collection') {	// Not a PDS4 collection label
			console.log("Error: File is not a collection label.");
			console.log(options.collection);
			return;
		}
		
		// Get collection id and output file name
		options.id = content[product].Identification_Area.logical_identifier;
		options.output = path.normalize(path.join(path.dirname(options.collection), content[product].File_Area_Inventory.File.file_name));
		
		// Read the XML file up to the root document tag (to <Identification_Area>)
		// This is a cludge because fastXMLParser does no preserve processing instructions
		// and does a poor job formating the attributes in the root document tag.
		// We add this "header" to the output document.
		var liner = new readlines(filename);

		var next;
		var delim = "";
		while (next = liner.next()) {
			var buffer = next.toString('utf8');
			if(buffer.indexOf("<Identification_Area>") > -1) break;	// Limit of "header"
			labelHeader += delim + buffer; delim = "\n";
		}

	}

	// Check arguments - must have a collection id
	if(options.id == "") {
		console.log("");
		console.log("Missing collection id. Use -i or -c to specifiy.");
		return;
	}
	
	if(options.verbose) { console.log("Collection ID: " + options.id); }
	
	var startTime = "";
	var stopTime = "";
	var targetList = [];
	var primaryResultSummary = {};
	var observingSystem = [];
	var inventory = fs.createWriteStream(options.output, {
			flags: 'w' // 'w' overwrite (old data will be lost)
		});
		
	walk.walk(pathname, walkOptions)
	    .on("file", function (root, fileStats, next) {
		    if(fileStats.name.endsWith(".xml")) { 	// Parse
				// console.log("Processing: " + root + "/" + fileStats.name);
				// console.log(JSON.stringify(fileStats, null, 3));
				var pathname = path.normalize(path.join(root, fileStats.name));
				var xmlDoc = fs.readFileSync(pathname, 'utf8');
				var content = fastXmlParser.parse(xmlDoc, { parseNodeValue : false } );	// Check syntax

				var product = Object.keys(content)[0];
				if(product.startsWith('Product_')) {	// PDS4 product
					cnt++;
					if(product == 'Product_Collection') { next(); return; } // Don't include Product_Collections
					var lid = content[product].Identification_Area.logical_identifier;
					if( ! lid.startsWith(options.id)) { next(); return; }	// Not part of collection

					var vid = content[product].Identification_Area.version_id;
					
					// Get min start_date_time and max stop_date_time 
					var dateTime = "";
					try {
						dateTime = content[product].Observation_Area.Time_Coordinates.stop_date_time;
						if(stopTime < dateTime) { stopTime = dateTime; }
						if(startTime.length < 1) { startTime = stopTime; }
						dateTime = content[product].Observation_Area.Time_Coordinates.start_date_time;
						if(startTime > dateTime) { startTime = dateTime; }
					} catch(e) {
						// Do nothing - elements are not required
					}
					
					
					// Get unique list of Target_Identification (if present)
					try {
						var targets = asArray(content[product].Observation_Area.Target_Identification);
						for(var i = 0; i < targets.length; i++) {
							var target = targets[i];
							if( ! isSame(targetList, target)) targetList.push(target);
						}				
					} catch(e) {
						console.log('No Observation_Area/Target_Identification in file.');
						console.log(pathname);
					}
					
					// Get Unique list of Primary_Results_Summary (if present)				
					try {
						// Purpose
						var purpose = asArray(content[product].Observation_Area.Primary_Result_Summary.purpose);
						
						if(purpose.length > 0) {	// Merge
							primaryResultSummary.purpose = mergeArray(primaryResultSummary.purpose, purpose);
						}
						
						// Processing Level
						var processing_level = asArray(content[product].Observation_Area.Primary_Result_Summary.processing_level);
						
						if(processing_level.length > 0 ) { // Merge
							primaryResultSummary.processing_level = mergeArray(primaryResultSummary.processing_level, processing_level);
						}
						
						// Description
						if(content[product].Observation_Area.Primary_Result_Summary.description) {
							prsDescription = content[product].Observation_Area.Primary_Result_Summary.description;
						}

						// Science Facets
						var Science_Facets = asArray(content[product].Observation_Area.Primary_Result_Summary.Science_Facets);
						
						if(Science_Facets.length > 0) {	// Merge
							primaryResultSummary.Science_Facets = mergeArray(primaryResultSummary.Science_Facets, Science_Facets);
						}

					} catch(e) {
						// Do nothing - Element is optional
					}


					// Observing System
					try{
						// Observing System
						var Observing_System = asArray(content[product].Observation_Area.Observing_System);
						
						if(Observing_System.length > 0) {	// Merge
							observingSystem = mergeArray(observingSystem, Observing_System);
						}

					} catch(e) {
						// Do nothing - Element is optional
					}
					
					// Write to inventory
					inventory.write("P," + lid + "::" + vid + "\r\n");	// CR/LF required
					records++;
				}
		    }
		    next();
	    })
	    .on("directories", function (root, dirStatsArray, next) {
			cnt++;
			if(options.verbose) console.log("Scanning: " + root);
			next();
	    })
	   .on("errors", function (root, nodeStatsArray, next) {
	  	    next();
	    })
	   .on("end", function () {
		    inventory.end();	// Close inventory file
			if(options.collection.length > 0) {	// Update collection information
				if(options.verbose) { console.log('Writing inventory to: ' + options.output); }
				var stat = fs.statSync(options.output);
				var hash = crypt.createHash('md5');
				var stream = fs.createReadStream(options.output);
				stream.on('data', function(data) {
					hash.update(data, 'utf8')
				});
				stream.on('end', function() {
					var md5Checksum = hash.digest('hex');
					
					if(options.verbose) {
						console.log("Extracted information")
						console.log("---------------------")
						console.log('   file_size: ' + stat.size);
						console.log('   creation_date: ' + stat.mtime.toISOString());
						console.log('   md5_checksum: ' + md5Checksum);
						console.log('   records: ' + records);
						console.log('   start_date_time: ' + startTime);
						console.log('   stop_date_time: ' + stopTime);
						console.log('   Target_Identification:')
						console.log(JSON.stringify(targetList, null, 3));
						console.log('   Primary_Result_Summary:');
						console.log(JSON.stringify(primaryResultSummary, null, 3));
						console.log('   Observing_System:');
						console.log(JSON.stringify(observingSystem, null, 3));
					}
					
					// Update label
					var product = Object.keys(collectionLabel)[0];
					// console.log("Product type: " + product);
					// console.log(JSON.stringify(collectionLabel, null, 3));
					collectionLabel[product].File_Area_Inventory.File.file_size = { "#text" : stat.size.toString(), "@_unit": "byte" };
					collectionLabel[product].File_Area_Inventory.File.creation_date_time = stat.mtime.toISOString();
					collectionLabel[product].File_Area_Inventory.File.md5_checksum = md5Checksum;
					collectionLabel[product].File_Area_Inventory.Inventory.records = records;
					collectionLabel[product].Context_Area.Time_Coordinates.start_date_time = startTime;
					collectionLabel[product].Context_Area.Time_Coordinates.stop_date_time = stopTime;
					collectionLabel[product].Context_Area.Target_Identification = targetList;
					collectionLabel[product].Context_Area.Primary_Result_Summary = primaryResultSummary;
					collectionLabel[product].Context_Area.Observing_System = observingSystem;

					var writer = new XMLEngine({
						ignoreAttributes: false,
						format: true,
						indentBy: "  ",
					});
					
					// Replace the "header" (processing instructions and root document tag)
					// And fix formating when an element has an attribute by unwrapping line containing opening tag.
					if(options.collection.length > 0) {	// Write label
						fs.writeFileSync(options.collection,
							writer.parse(collectionLabel).replace(/<Product_Collection.*>/, labelHeader).replace(/\"\>\n([^ ]+) +\<\//g, '">$1</')
						);
					}
 
				});
			}
			if(options.verbose) {
				console.log((new Date(Date.now())).toUTCString());
				console.log("Processed " + cnt + " files in seconds elapsed = " + (Date.now() - start)/1000);
			}
	   })
	;
}

main(args);