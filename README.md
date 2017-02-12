# Spytext - The Tiny HTML5 Editor

Spytext is an HTML5 editor, not a Rich Text Editor, weighing in at 8.6 kb.

Spytext is built `contentEditable`, but most browsers handle handling line
breaks, new sections, backspaces, deletes, formatting etc very differently. As
a result, Spytext uses it's own DOM manipulating commands (through
[dollr](https://github.com/lohfu/dollr)), selection management (through
[selektr](https://github.com/lohfu/selektr)) and DOM undo/redo (through
[snapback](https://github.com/lohfu/snapback)). The only parts contentEditable
still handles are actual type inputs and text traversal (arrow buttons, page
up, etc).

Despite all this, the entire library (including ALL dependencies)
is [tiny](#spytext-is-tiny).

## Demo

There is a Plunker demo at: <https://embed.plnkr.co/sJNI4kVqX7VEgA0mY2UJ/>

## Usage

### NPM

```
$ npm install spytext
```

```js
import Spytext from 'spytext';

/* OR */

var Spytext = require('spytext');

document.addEventListener('DOMContentLoaded', function () {
  var spytext02 = new Spytext({ el: document.getElementById('#spytext-field') });
}, false);
```

### CDN (UMD build)

```html
<script src="https://unpkg.com/spytext@0.9.1/dist/spytext.min.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function () {
  var spytext02 = new Spytext({ el: document.getElementById('#spytext-field') });
}, false);
</script>
```

## Functionality

+ Styling text with italic, bold, underline or strike-trough
+ Change between P, H1, H2, H3, H4, H5 and H6 blocks for text
+ Align/justify text blocks
+ Create ordered and unordered lists
+ Indent/outdent these lists and
+ Selection management
+ Undo/redo (including remembering selections positions)

## Spytext is Tiny

                                   | Minified  | Compressed
-----------------------------------|-----------|-----------
Spytext (UMD build, all deps)      | 29 kb     | 8.6 kb    


## Compatibility

        | Quirky    | Without Undo | Full      |
--------|-----------|--------------|-----------|
Chrome  |         9 | 16           | 18        |
IE      |       N/A | 9            | N/A       |
Firefox |         1 | 3.6          | 14        |
Safari  | Unknown   | Unknown      | 6         |
Opera   | Unknown   | Unknown      | 15        |
