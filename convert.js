#!/usr/bin/env node

var sax = require("sax");
var fs = require("fs");

//////////////////////////////////////////////////////////////////////////////
// read command line:
let cmd_args = 2; // number of non-arg args e.g.: ["node", "./email.js"]
let num_args_required = 2;
if (process.argv.length < (num_args_required+cmd_args)) {
  console.log( `
Not enough arguments (need ${num_args_required}, ${process.argv.length-cmd_args} given).
Usage:
    ${process.argv[cmd_args-1]} <listxml.xml> <mamewah.lst>

Example:
    ./convert.js listxml.xml mamewah.lst
`);
  process.exit( -1 );
}
let listxml = process.argv[2];
let mamewahlst = process.argv[3];
console.log( listxml, mamewahlst );
let stack = [];
let machine = {};

//////////////////////////////////////////////////////////////////////////////

const capitalize = (s) => {
  if (typeof s !== 'string') return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const toUpperCase = (s) => {
  if (typeof s !== 'string') return ''
  return s.toUpperCase();
}
function sanitize( str ) {
  return str != undefined ? str : ""
}
function createBlock( machine ) {
  return `${sanitize(machine.name)}
${sanitize(machine.description)}
${sanitize(machine.year)}
${sanitize(machine.manufacturer)}
${sanitize(toUpperCase(machine.romof))}
${sanitize(toUpperCase(machine.cloneof))}
${sanitize(capitalize(machine.display_type))}
${sanitize(capitalize(machine.display_orientation))}
${sanitize(Object.keys( machine.input_types ).join(", "))}
Status ${sanitize(capitalize(machine.status))}
Color ${sanitize(capitalize(machine.status_color ? machine.status_color : machine.status))}
Sound ${sanitize(capitalize(machine.status_sound ? machine.status_sound : machine.status))}

`;
}

function output( machine ) {
  // if you only want arcade games :)
  if (machine.coins == undefined) {
    //process.stdout.write( `${machine.name} '${machine.description}' (SOFTWARE, skipping!), ` );
    return;
  }
  
  /*if (
    (machine.romof != undefined && machine.sampleof != undefined && machine.romof != machine.sampleof) ||
    (machine.sampleof != undefined && machine.cloneof != undefined && machine.sampleof != machine.cloneof) ||
    (machine.cloneof != undefined && machine.romof != undefined && machine.cloneof != machine.romof)
    ) {
    console.log( machine, "they dont match")
  }*/
  process.stdout.write( machine.name + ', ' ); // output very short name so user can watch progress
  //process.stdout.write( createBlock( machine ) ); // DEBUG: output the mamewah.lst output to the screen
  writeStream.write( createBlock( machine ), 'utf8' );
}

//////////////////////////////////////////////////////////////////////////////
// sax stream parser
let strict = true;
let options = {};
let saxStream = require("sax").createStream(strict, options)
let writeStream = fs.createWriteStream( mamewahlst );

// called on each open XML tag
saxStream.on("opentag", function (node) {
  stack.push( node.name );   //
  /////////////////////////////

  //console.log( "open", stack.join( "/" ) );

  if (stack.join( "/" ) === "mame/machine") {
    machine = { input_types: [] }; // <<-- new entry, zero out the machine.
    machine.name = node.attributes.name
    machine.cloneof = node.attributes.cloneof
    machine.romof = node.attributes.romof
    machine.sampleof = node.attributes.sampleof
    machine.ismechanical = node.attributes.sourcefile
    machine.sourcefile = node.attributes.ismechanical
  }
  if (stack.join( "/" ) === "mame/machine/input") {
    machine.players = node.attributes.players
    machine.coins = node.attributes.coins
  }
  if (stack.join( "/" ) === "mame/machine/input/control") {
    //console.log( machine.input_types )
    function sanitizeInputType( attrs ) {
      let ways = attrs.ways;
      let map = { "joy": "Joystick" }
      return (ways ? `${ways}-Way ` : ``) + capitalize(map[attrs.type] ? map[attrs.type] : attrs.type);
    }
    machine.input_types[sanitizeInputType( node.attributes )] = true;
  }
  if (stack.join( "/" ) === "mame/machine/sound") machine.sound_channels = node.attributes.channels
  if (stack.join( "/" ) === "mame/machine/driver") {
    machine.status = node.attributes.status
    machine.emulation = node.attributes.emulation
    machine.savestate = node.attributes.savestate
  }
  if (stack.join( "/" ) === "mame/machine/display" && node.attributes.tag=="screen") {
    machine.display_type = node.attributes.type
    machine.display_rotate = node.attributes.rotate
    machine.display_orientation = node.attributes.rotate == 0 || node.attributes.rotate == 180 ? "Horzontal" : "Vertical"
    machine.display_width = node.attributes.width
    machine.display_height = node.attributes.height
  }
})

// called on each closing XML tag
saxStream.on("closetag", function (node) {
  //console.log( "close", stack.join( "/" ) );
  if (stack.join( "/" ) === "mame/machine") output( machine )

  /////////////////////////////
  stack.pop();               //
})

// called on each node's text area, when text is present
saxStream.on("text", function (node) {
  //console.log( node );
  if (stack.join( "/" ) === "mame/machine/description") machine.description = node
  if (stack.join( "/" ) === "mame/machine/year") machine.year = node
  if (stack.join( "/" ) === "mame/machine/manufacturer") machine.manufacturer = node
})

// called on each error
saxStream.on("error", function (e) {
  console.error("error!", e)
  // clear the error
  this._parser.error = null
  this._parser.resume()
})

// called when done parsing the listxml.xml
saxStream.on("end", function (e) {
  console.log( "\n\ndone" );
  writeStream.end();
  process.exit(0);
})


// start the xml file stream, and kickoff the parser
// pipe is supported, and it's readable/writable
// same chunks coming in also go out.
fs.createReadStream( listxml )
  .pipe( saxStream )
//  .pipe(fs.createWriteStream( "file-copy.xml" ))
//////////////////////////////////////////////////////////////////////////////

