
# Modern Mame to Legacy Mamewah list generator

Still using Mamewah for your frontend?  Me too! (at least today I am... who knows for how much longer I will)

Modern Mame (e.g. 0.223) outputs a xml list that is incompatible with the old mamewah list parser, so let's generate a mamewah list with a simple script!

## install:
```
npm install
```

## usage:
Output the listxml from mame:
```
mame64 -listxml > listxml.xml
```
Convert the listxml to a mamewah lst file
```
convert.js listxml.xml mamewah.lst
```
Then copy the mamewah.lst file to mamewah/files directory.  So, if your emulator is in mamewah/config/mame/mame.cfg, then copy to mamewah/files/mame.lst

