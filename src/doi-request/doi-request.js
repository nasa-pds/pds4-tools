#!/usr/bin/env node
"use strict";
/*eslint-disable no-console*/
/**
 * Generate a DOI request.
 *
 * Extract information from a PDS4 label and generate an DOI request which can 
 * be used with Interagency Data (IAD) web services.
 * 
 * @author Todd King
 **/
const fs = require('fs');
const yargs = require('yargs');
const path = require('path');
const fastXmlParser = require('fast-xml-parser');
const util = require('util');
 
// Configure the app
var options  = yargs
	.version('1.0.1')
	.usage('Extract information from a PDS4 label and generate an DOI request which can be used with Interagency Data (IAD) web services.\n\nUsage:\n\n$0 [args] <files...>')
	.example('$0 example.xml', 'generate a DOI request')
	.epilog("Development funded by NASA's PDS project at UCLA.")
	.showHelpOnFail(false, "Specify --help for available options")
	.help('h')
	
	// version
	.options({
		// help text
		'h' : {
			alias : 'help',
			description: 'Show information about the app.'
		},		
		
		// Output
		'o' : {
			alias : 'output',
			description: 'Output file.',
			type: 'string',
			default: null
		},
		
		// Pretty-print
		'x' : {
			alias : 'pretty',
			description: 'Pretty output.',
			type: 'boolean'
		},
		
		// Collection product type
		'c' : {
			alias : 'collection',
			description: 'Submit as a collection. Use for document collection, but not for data or borwse collections.'
		},	
		
		// Reserve DOI
		'r' : {
			alias : 'reserve',
			description: 'Reserve generated DOI and do not publically release immeadiately.'
		},	
		
		// Author list (creators)
		'u' : {
			alias : 'author',
			description: 'Author list. Separate names with semi-colon. Names are first, last[, middle]',
			type: 'string',
			default: null

		},
		
		// Publisher
		'p' : {
			alias : 'publisher',
			description: 'Name of the publisher.',
			type: 'string',
			default: "NASA's Planetary Data System (PDS)"

		},
		
		// Sponsor
		's' : {
			alias : 'sponsor',
			description: 'Name of the sponsor organization.',
			type: 'string',
			default: "National Aeronautics and Space Administration (NASA)"

		},
		
		/*
		// Contact Name
		'n' : {
			alias : 'name',
			description: 'Contact name.',
			type: 'string',
			default: "PDS Operator"

		},
		
		// Contact Organization
		'g' : {
			alias : 'organization',
			description: 'Name of the contact organization.',
			type: 'string',
			default: "Planetary Data System (PDS)"

		},
		
		// Contact Email
		'e' : {
			alias : 'email',
			description: 'Contact email address.',
			type: 'string',
			default: "pds-operator@jpl.nasa.gov"

		},
		
		// Contact telephone number
		't' : {
			alias : 'phone',
			description: 'Contact telephone number.',
			type: 'string',
			default: "818.393.7165"

		},
		*/
		
		// Availability
		'a' : {
			alias : 'availability',
			description: 'The name of any office or organization that can offer additional help in obtaining or utilizing the dataset.',
			type: 'string',
			default: "NSSDCA"

		},
		
		// Landing page URL
		'n' : {
			alias : 'landing',
			description: 'The landing page URL.',
			type: 'string',
			default: "https://pds.jpl.nasa.gov/ds-view/pds/viewCollection.jsp?identifier=%s"

		},
		
		// Publication date 
		'd' : {
			alias : 'date',
			description: 'Publication date (YYYY-MM-DD).',
			type: 'string',
			default: ""

		},
		
		// Contributor 
		'b' : {
			alias : 'contributor',
			description: 'Contributor organization.',
			type: 'string',
			default: "PDS Planetary Plasma Interactions (PPI) Node"
		},
		
		// Country 
		'y' : {
			alias : 'country',
			description: 'Standard country code.',
			type: 'string',
			default: "US"
		},
		
		// Language 
		'l' : {
			alias : 'language',
			description: 'Language for text.',
			type: 'string',
			default: "English"
		},

		// Format
		'f' : {
			alias : 'format',
			description: 'Output format.',
			choices: ['xml', 'json'],
			default: 'xml'
		},
		

	})
	.argv
	;

// Global variables
var args = options._;	// Remaining non-hyphenated arguments
var outputFile = null;	// None defined.

/** 
 * Write to output file if defined, otherwise to console.log()
 **/
var outputWrite = function(str) {
	if(outputFile == null) {
		console.log(str);
	} else {
		outputFile.write(str);
		if(options.pretty) outputFile.write("\n");
	}
}

/**
 * Close an output file if one is assigned.
 **/
var outputEnd = function() {
	if(outputFile) { outputFile.end(); outputFile = null }
}

/**
 * Search through a Modification_History and find the most recent modification date.
 *
 **/
var getRecentModification = function(hist) {
	var modDate = "";
	if(Array.isArray(hist.Modification_Detail)) {	// Find most recent
		for(var i = 0; i < hist.Modification_Detail.length; i++) {
			var d = hist.Modification_Detail[i].modification_date
			if(d > modDate) modDate = d;
		}
	} else {	// Single value
		modDate = hist.Modification_Detail.modification_date;
	}
	return modDate;
}

/**
 * Format an ISO data string into the required format for an OSTI IAD request.
 **/
var formatDate = function(isoDate) {
	var d = new Date(isoDate);
	var day = d.getDate().toString();
	var month = d.getMonth().toString();
	
	// Add zero padding (if needed)
	if(day.length < 2) day = "0" + day;
	if(month.length < 2) month = "0" + month;
	
	return month + "/" + day + "/" + d.getFullYear();
}

/**
 * Format an ISO data string into the required format for an OSTI IAD request.
 **/
var formatDateYYYYMMDD = function(isoDate) {
	var d = new Date(isoDate);
	var year = d.getFullYear();
	var day = d.getDate().toString();
	var month = d.getMonth().toString();
	
	// Add zero padding (if needed)
	if(day.length < 2) day = "0" + day;
	if(month.length < 2) month = "0" + month;
	
	return year + "-" + month + "-" + day;
}

/**
 * Format a PDS4 product type into a string useful as the product_type_specific in an OSTI IAD request.
 **/
var formatProduct = function(productType) {
		return "PDS4 " + productType.replace(/^Product_/, "");
}

/** 
 * Parse any author list string into an array of Author objects
 *
 * Author string has the format "last, first[, middle]" with the list of authors separated by a semi-colon (;)
 **/
var parseAuthors = function(authors) {
	var list = [];
	
	var alist = authors.split(";");
	for(var i = 0; i < alist.length; i++) {
		var names = alist[i].split(",");
		var author = {
			// "first_name": "",
			// "last_name": "",
			// "middle_name": "",
			"affiliations": []
		};
		if(names.length > 0) author.last_name = names[0];
		if(names.length > 1) author.first_name = names[1];
		if(names.length > 2) author.middle_name = names[2];
		list.push(author);
	}
	return list;
}

/** 
 * Compile a semi-colon separated list of keywords by harvesting from all areas of a PDS label.
 **/
var getKeywords = function(product) {
	var delim = "";
	var keywords = "";
	
	if(product.Context_Area.Observing_System) {
		if(Array.isArray(product.Context_Area.Observing_System.Observing_System_Component)) {
			for(var i = 0; i < product.Context_Area.Observing_System.Observing_System_Component.length; i++) {
				keywords += delim + product.Context_Area.Observing_System.Observing_System_Component[i].name; delim = ";";
			}		
		} else {
			keywords += delim + product.Context_Area.Observing_System.Observing_System_Component.name; delim = ";";
		}
	}
	
	if(product.Context_Area.Target_Identification) {
		if(Array.isArray(product.Context_Area.Target_Identification)) {
			for(var i = 0; i < product.Context_Area.Target_Identification.length; i++) {
				keywords += delim + product.Context_Area.Target_Identification[i].name; delim = ";";
			}
		} else {
			keywords += delim + product.Context_Area.Target_Identification; delim = ";";			
		}
		keywords += delim + product.Context_Area.Investigation_Area.name; delim = ";";
		if(product.Context_Area.Primary_Result_Summary) {	// Introduced in PDS4 IM ???
			keywords += delim + product.Context_Area.Primary_Result_Summary.purpose; delim = ";";
			keywords += delim + product.Context_Area.Primary_Result_Summary.processing_level; delim = ";";
		}
	}
	
	if(product.Context_Area.Mission_Area) {
		var keys = Object.keys(product.Context_Area.Mission_Area);
		for(var i = 0; i < keys.length; i++) {
			if(keys[i].mission_phase_name) {
				for(var n = 0; n < keys[i].mission_phase_name.length; n++) {
					keywords += delim + keys[i].mission_phase_name[n]; delim = ";";
				}
			}
		}
	}
	
	if(product.Identification_Area.Citation_Information) {	// Look for keywords	
		if(product.Identification_Area.Citation_Information.keyword) { 
			if(Array.isArray(product.Identification_Area.Citation_Information.keyword)) {
				for(var i = 0; i < product.Identification_Area.Citation_Information.keyword.length; i++) {
					keywords += delim + product.Identification_Area.Citation_Information.keyword[i]; delim = ";";
				}
			} else {
				keywords += delim + product.Identification_Area.Citation_Information.keyword; delim = ";";			
			}
		}
	}
	
	return keywords;
}

/**
 * Application entry point.
 **/
var main = function(args)
{
	// If no files or options show help
	if (args.length == 0) {
	  yargs.showHelp();
	  return;
	}

	// Output
	if(options.output) {
		outputFile = fs.createWriteStream(options.output);
	}
	
	var productType = "Dataset";
	
	if(options.collection) productType = "Collection";	

	var pathname = args[0];
	var xmlDoc = fs.readFileSync(pathname, 'utf8');
	var content = fastXmlParser.parse(xmlDoc);	// Check syntax

	var product = Object.keys(content)[0];
	
	// General info (lid, title, description)
	var lid = content[product].Identification_Area.logical_identifier;
	var version = content[product].Identification_Area.version_id;
	var title = content[product].Identification_Area.title;
	var description = title;
	if(content[product].Identification_Area.Citation_Information) {	// Use description
		description = content[product].Identification_Area.Citation_Information.description;
	}

	// author list
	if(content[product].Identification_Area.Citation_Information) {	// Use author list		
		if(content[product].Identification_Area.Citation_Information.author_list) {
			options.author = content[product].Identification_Area.Citation_Information.author_list;
		}
	}
	
	// Publication date
	var hist = [];
	hist = content[product].Identification_Area.Modification_History;
	var pubdate = getRecentModification(hist);
	if(options.date.length > 0) pubdate = options.date; // Override
	
	// Keywords
	var keywords = getKeywords(content[product]);
	
	// Landing page 
	var landing = util.format(options.landing, lid);
	
	// Check arguments
	if( ! options.author) {
		console.log('Warning: Missing author information. Use "-u" to specify on command line.');
		options.author = "unknown";
	}
	
	// IAD2 JSON format
	var iad2 = {
		"records": [{
			// "id": "221299",	// unique identifier for the record - used for updates
			// "accession_number" : "unique",	// 
			"title": title,
			"description": description,
			"authors": parseAuthors(options.author),
			"contributors": [
				{ "full_name": options.contributor,
				  "contributor_type": "Editor",
				  "affiliations": [] 
				}
			],
			// "doi": "10.5072/for-example-purposes/221299",
			// "doi_infix":"for-example-purposes",
			"publisher": options.publisher,
			"country": options.country,	// "US"
			"product_type": productType,	// "Dataset","Text" or "Collection"
			"product_type_specific": formatProduct(product),
			"language": options.language,	// "English"
			"publication_date": formatDate(pubdate),
			"date_added": formatDate(pubdate),
			// "date_updated":"2017-11-27",
			"sponsoring_organization": options.sponsor,
			"research_organization": options.contrib,
			// "report_numbers": "98776",
			// "contract_numbers": "DE-39043-2017",
			"other_numbers": lid + '::' + version ,
			"availability": options.availability,
			"keywords": keywords,
			// "related_identifiers": [
			//	{ "identifier_value":"10.5072/23432",
			//	  "identifier_type":"DOI",
			//	  "relation_type":"Cites"
			//	}
			// ]
		}],
		"start":0,
		"total":1
	}
	
	// Conditional additions
	if(options.reserve) {	// Do not put value in <site_url>
		iad2.records[0]['status'] = "Reserved";
	} else {
		iad2.records[0]['site_url'] = landing;
	}

	var request = JSON.stringify(iad2.records, null, 3);	// Formatted string
	if(options.output) {	// Show some instructions
		console.log('DOI request information can be submitted with the command:');
		console.log("");
		if(options.format == 'json') {
			console.log('curl -u LOGINNAME:PASSWORD -X POST -H "Content-Type: application/json" --data' 
				+ ' @' + options.output + ' https://www.osti.gov/iad2/api/records');
			console.log("");
			if( ! options.pretty) { request = JSON.stringify(iad2.records); }	// One long string
			outputWrite(request);
		} else {
			console.log('curl -u LOGINNAME:PASSWORD -X POST -H "Content-Type: application/json" --data' 
				+ ' @' + options.output + ' https://www.osti.gov/iad2/api/records');
			console.log("");
		}
	}
	
	if(options.format == 'json') {
		console.log('curl -u LOGINNAME:PASSWORD -X POST -H "Content-Type: application/xml" --data' 
			+ ' @' + options.output + ' https://www.osti.gov/iad2/api/records');
		console.log("");
		var request = JSON.stringify(iad2.records);	// One long string
		outputWrite(request);
	} else {
		// IAD XML format
		outputWrite('<?xml version="1.0" encoding="UTF-8" ?>');
		outputWrite('<!-- Generated from: ' + pathname + ' -->');
		outputWrite('<records start="0" total="1">');
		outputWrite('   <record>');
		outputWrite('      <title>' + title + '</title>');
		outputWrite('      <sponsoring_organization>' + options.sponsor + '</sponsoring_organization>');
		outputWrite('      <research_organization>' + options.contrib + '</research_organization>');
		outputWrite('      <product_type>' + productType + '</product_type>');	// "Dataset","Text" or "Collection"
		outputWrite('      <product_type_specific>' + formatProduct(product) + '</product_type_specific>');
		outputWrite('      <language>' + options.language + '</language>');	// "English"
		outputWrite('      <publisher>' + options.publisher + '</publisher>');
		outputWrite('      <publication_date>' + formatDateYYYYMMDD(pubdate) + '</publication_date>');
		outputWrite('      <product_date_added>' + formatDateYYYYMMDD(pubdate) + '</product_date_added>');
		outputWrite('      <other_nos>' + lid + '::' + version + '</other_nos>');
		outputWrite('      <availability>' + options.availability + '</availability>');
		outputWrite('      <country>' + options.country + '</country>');
		outputWrite('      <description>' + description + '</description>');
		if(options.reserve) {	// Do not put value in <site_url>
			outputWrite('      <site_url/>');
		} else {
			outputWrite('      <site_url>' + landing + '</site_url>');
		}
		outputWrite('      <keywords>' + keywords + '</keywords>');
		outputWrite('      <authors>');
		var authors = parseAuthors(options.author);
		for(var i = 0; i < authors.length; i++) {
			outputWrite('         <author>');
			if(authors[i].first_name)	outputWrite('            <first_name>' + authors[i].first_name + '</first_name>');				
			if(authors[i].last_name)	outputWrite('            <last_name>' + authors[i].last_name + '</last_name>');				
			if(authors[i].middle_name)	outputWrite('            <middle_name>' + authors[i].middle_name + '</middle_name>');				
			outputWrite('         </author>');
			
		}
		outputWrite('      </authors>');
		outputWrite('      <contributors>');
		outputWrite('         <full_name>' + options.contributor + '</full_name>');
		outputWrite('         <contributor_type>Editor</contributor_type>');
		outputWrite('         <affiliations/>'); 
		outputWrite('      </contributors>');
		outputWrite('      <related_identifier/>');			
		outputWrite('      <contract_numbers>' + '</contract_numbers>');
		outputWrite('      <availability>' + options.availability + '</availability>');
		/*
		outputWrite('      <contact_name>' + options.name + '</contact_name>');
		outputWrite('      <contact_org>' + options.organization + '</contact_org>');
		outputWrite('      <contact_email>' + options.email + '</contact_email>');
		outputWrite('      <contact_phone>' + options.phone + '</contact_phone>');
		*/
		if(outputWrite.reserve) {
			console.log('      <set_reserved/>');
		}
		outputWrite('   </record>');
		outputWrite('</records>');
	}
	outputEnd();
	
}

main(args);
