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
console.log( "reading: ", listxml, " writing: ", mamewahlst );
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

function toDOS( str ) {
  // \r is "Carriage Return" (CR, ASCII character 13)
  // \n is "Line Feed" (LF, ASCII character 10)
  // UNIX    - LF   \n
  // Mac osX - LF   \n (it's unix afterall)
  // Mac os9 - CR   \r
  // DOS     - CRLF \r\n
  if (str.match(/\r\n/))    // DOS
    return str;
  else if (str.match(/\r/)) // MAC
    return str.replace( /\r/g, "\r\n" ); // output DOS CRLF
  else if (str.match(/\n/)) // UNIX
    return str.replace( /\n/g, "\r\n" ); // output DOS CRLF
}

function createBlock( machine ) {
  let str = `${sanitize(machine.name)}
${sanitize(machine.description)}
${sanitize(machine.year)}
${sanitize(machine.manufacturer)}
${sanitize(toUpperCase(machine.romof))}
${sanitize(toUpperCase(machine.cloneof))}
${sanitize(capitalize(machine.display_type))}
${sanitize(capitalize(machine.display_orientation))}
${sanitize(machine.input_types)}
Status ${sanitize(capitalize(machine.status))}
Color ${sanitize(capitalize(machine.status_color ? machine.status_color : machine.status))}
Sound ${sanitize(capitalize(machine.status_sound ? machine.status_sound : machine.status))}

`;

  // output DOS format, CRLF line endings...
  return toDOS( str );
}

function output( machine ) {
  // for smaller testing, just output 1943 games...  hit ctrl-c to finish early...
  //if (!machine.name.match( /^194/ )) return;

  // if you only want arcade games :)   (i do)
  // computers dont have coin slots, so only output items with coins
  if (machine.coins == undefined) {
    //process.stdout.write( `${machine.name} '${machine.description}' (SOFTWARE, skipping!), ` );
    return;
  }

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
    machine = { input_type: [] }; // <<-- new entry, zero out the machine.
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
    function sanitizeInputType( attrs ) {
      let ways = parseInt( attrs.ways ) ? `${parseInt( attrs.ways )}-Way` : attrs.ways;
      let map = { "joy": "Joystick" }
      return (ways ? `${ways} ` : ``) + capitalize(map[attrs.type] ? map[attrs.type] : attrs.type);
    }
    machine.input_type[sanitizeInputType( node.attributes )] = true;
    machine.input_types = Object.keys( machine.input_type ).join(", ")
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

