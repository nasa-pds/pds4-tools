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
	.version('1.0.0')
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
			default: ""

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
		// Contact Name
		'n' : {
			alias : 'name',
			description: 'Contact name.',
			type: 'string',
			default: "PDS Operator"

		},
		// Contact Organization
		'o' : {
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
		// Availability
		'a' : {
			alias : 'availability',
			description: 'The name of any office or organization that can offer additional help in obtaining or utilizing the dataset.',
			type: 'string',
			default: "NSSDCA"

		},
		// Landing page URL
		'l' : {
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
		// Publication date 
		'b' : {
			alias : 'contrib',
			description: 'Contributor organization.',
			type: 'string',
			default: "PDS Planetary Plasma Interactions (PPI) Node"

		},
		

	})
	.argv
	;

var args = options._;	// Remaining non-hyphenated arguments

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
 * Format a PDS4 product type into a string useful as the product_type_specific in an OSTI IAD request.
 **/
var formatProduct = function(productType) {
		return "PDS4 " + productType.replace(/^Product_/, "");
}

/** 
 * Compile a semi-colon separated list of keywords by harvesting from all areas of a PDS label.
 **/
var getKeywords = function(product) {
	var delim = "";
	var keywords = "";
	
	keywords += delim + product.Context_Area.Observing_System.Observing_System_Component.name; delim = ";";
	for(var i = 0; i < product.Context_Area.Target_Identification.length; i++) {
		keywords += delim + product.Context_Area.Target_Identification[i].name; delim = ";";
	}
	keywords += delim + product.Context_Area.Investigation_Area.name; delim = ";";
	keywords += delim + product.Context_Area.Primary_Result_Summary.purpose; delim = ";";
	keywords += delim + product.Context_Area.Primary_Result_Summary.processing_level; delim = ";";
	
	for(var i = 0; i < product.Context_Area.Mission_Area.MAVEN.mission_phase_name.length; i++) {
		keywords += delim + product.Context_Area.Mission_Area.MAVEN.mission_phase_name[i]; delim = ";";
	}

	if(product.Identification_Area.Citation_Information) {	// Look for keywords	
		if(product.Identification_Area.Citation_Information.keyword) { 
			for(var i = 0; i < product.Identification_Area.Citation_Information.keyword.length; i++) {
				keywords += delim + product.Identification_Area.Citation_Information.keyword[i]; delim = ";";
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

	// Creators (author list)
	var creators = "undefined";
	if(content[product].Identification_Area.Citation_Information) {	// Use author list		
		creators = content[product].Identification_Area.Citation_Information.author_list;
	}
	if(options.author.length > 0) {	// Override 
		creators = options.author;
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
	
	// console.log(JSON.stringify(content, 3, null));
	console.dir(content);
	console.dir(Object.keys(content));
	console.log(getRecentModification(hist));
	
	console.log("<?xml version=\"1.0\" encoding=\"UTF-8\" ?>");
	console.log("<!-- Generated from: " + pathname + " -->" );
	console.log("");
	console.log("<records>");
	console.log("   <record>");
	console.log("		<title>" + title + "</title>");
	console.log("		<creators>" + creators + "</creators>");
	console.log("		<publisher>" + options.publisher + "</publisher>");
	console.log("		<publication_date>" + formatDate(pubdate) + "</publication_date>");
	if(options.reserve) {	// Do not put value in <site_url>
		console.log("		<site_url/>");
	} else {
		console.log("		<site_url>" + landing + "</site_url>");
	}
	console.log("		<product_type>" + productType + "</product_type>");
	console.log("		<product_type_specific>" + formatProduct(product) + "</product_type_specific>");
	console.log("		<product_nos>" + lid + "::" + version + "</product_nos>");
	console.log("		<description>" + description + "</description>");
	console.log("		<keywords>" + keywords + "</keywords>");
	console.log("		<related_resource/>");
	console.log("		<contributor_organizations>" + options.contrib + "</contributor_organizations>");
	console.log("		<sponsor_org>" + options.sponsor + "</sponsor_org>");
	console.log("		<contract_nos>" + "</contract_nos>");
	console.log("		<file_extension/>");
	console.log("		<availability>" + options.availability + "</availability>");
	console.log("		<contact_name>" + options.name + "</contact_name>");
	console.log("		<contact_org>" + options.organization + "</contact_org>");
	console.log("		<contact_email>" + options.email + "</contact_email>");
	console.log("		<contact_phone>" + options.phone + "</contact_phone>");
	if(options.reserve) {
		console.log("		<set_reserved/>");
	}
	console.log("	</record>");
	console.log("</records>");
	
}

main(args);
