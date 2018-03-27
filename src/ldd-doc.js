/**
 * Generate documentation for an LDD.
 *
 * Read and LDD specification file and generate documentation in Github Flavored Markdown.
 * 
 * @author Todd King
 **/
const fs = require('fs');
const yargs = require('yargs');
const path = require('path');
const fastXmlParser = require('fast-xml-parser');
 
// Configure the app
var options  = yargs
	.version('1.0.0')
	.usage('$0 [args] <files...>')
	.example('$0 example.xml', 'generate documentation for the LDD specification')
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

	})
	.argv
	;

var args = options._;

// Global variables
var namespace = "";

var localName = function(name)
{
	if(name.startsWith("pds.")) return name;
	
	var local = name.replace(namespace + ".", "");
	
	return "[" + local + "](#" + local.toLowerCase() + ")";
}

var main = function(args)
{
	// If no files or options show help
	if (args.length == 0) {
	  yargs.showHelp();
	  return;
	}
	
	var pathname = args[0];
	var xmlDoc = fs.readFileSync(pathname, 'utf8');
	var content = fastXmlParser.parse(xmlDoc);	// Check syntax
	
	var ldd = content.Ingest_LDD;
	
	namespace = ldd.namespace_id;
	
	console.log("# " + content.Ingest_LDD.name + " Local Data Dictionary");
	console.log("");
	console.log(content.Ingest_LDD.comment);
	console.log("");
	console.log("Version: " + ldd.ldd_version_id + "  ");
	console.log("Steward: " + ldd.steward_id);
	console.log("");			
	console.log("## Classes");			
	// Fix up - make single occurrence of some elements an array
	if( ! Array.isArray(ldd.DD_Class) ) { ldd.DD_Class = new Array(ldd.DD_Class); }
	for(let i = 0; i < ldd.DD_Class.length; i++) {
		var c = ldd.DD_Class[i];
		console.log("");			
		console.log("### " + c.name);			
		console.log(c.definition);			
		console.log("");			
		console.log("Attribute    | Min Occur. | Max Occur.");
		console.log("------------ | ---------- | -----------");
		// Fix up - make single occurrence of some elements an array
		if( ! Array.isArray(c.DD_Association ) ) { c.DD_Association = new Array(c.DD_Association); }
		for(let j = 0; j < c.DD_Association.length; j++) {
			var a = c.DD_Association[j];
			// Either "local_identifier" or "identifier_reference"
			var value = a.local_identifier;
			if( ! value ) value = a.identifier_reference;
		
			console.log(localName(value) + " | " + a.minimum_occurrences + " | " + a.maximum_occurrences);
		}
	}
	
	console.log("## Attributes");
	console.log("");
	// Fix up - make single occurrence of some elements an array
	if( ! Array.isArray(ldd.DD_Attribute) ) { ldd.DD_Attribute = new Array(ldd.DD_Attribute); }
	for(let i = 0; i < ldd.DD_Attribute.length; i++) {
		var a = ldd.DD_Attribute[i];
		console.log("");			
		console.log("### " + a.name);			
		console.log(a.definition);			
		console.log("");	
		var d = a.DD_Value_Domain;
		console.log("Type: " + d.value_data_type + "  ");			
		console.log("Units: " + d.unit_of_measure_type + "  ");
		if(d.minimum_value) {
			console.log("Minimum Value: " + d.minimum_value + "  ");
		}			
		if(d.maximum_value) {
			console.log("Maximum Value: " + d.maximum_value + "  ");
		}
		console.log("");	

		if(d.DD_Permissible_Value) {
			console.log("**Permissible Values**");
			console.log("");
			// Fix up - make single occurrence of some elements an array
			if( ! Array.isArray(d.DD_Permissible_Value) ) { d.DD_Permissible_Value = new Array(d.DD_Permissible_Value); }
			console.log("Name                                    | Description");
			console.log("--------------------------------------- | ----------------------------");
			for(let j = 0; j < d.DD_Permissible_Value.length; j++) {
				var v = d.DD_Permissible_Value[j];
				console.log(v.value + " | " + v.value_meaning);
			}
		}		
		console.log("");	
	}
}

main(args);