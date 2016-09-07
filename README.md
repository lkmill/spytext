# Spytext - The Tiny HTML5 Editor

Spytext is an HTML5 editor, not a Rich Text Editor.

Spytext uses `contentEditable`, but most browsers behave very differently in
handling line breaks, new sections, backspaces, deletes, formatting etc. As a
result, Spytext uses it's own DOM manipulating commands, selection management
(through [selekr](https://github.com/lohfu/selekr)) and DOM undo/redo
(through [snapback](https://github.com/lohfu/snapback)). The only parts conentEditable
still handles are actual type inputs and text traversal (arrow buttons, page up, etc).

Despite all this, the entire library (include dollr,
selektr and snapback, but without LoDash) weighs in around 10kb gzipped.

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
<script src="https://unpkg.com/spytext@0.8.0-alpha.5/dist/spytext.min.js"></script>
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
+ Undo/redo

## Spytext is Small

Spytext uses LoDash, which adds a significant amount of code.
If you already use LoDash in your project, total SpyText
footprint will be much smaller than values below.

                                   | Minified  | Compressed
-----------------------------------|-----------|-----------
Spytext (UMD build, all deps)      | 45.4kb    | 14.5kb    


## Compatability

        | Quirky    | Without Undo | Full      |
--------|-----------|--------------|-----------|
Chrome  |         9 | 16           | 18        |
IE      |       N/A | 9            | N/A       |
Firefox |         1 | 3.6          | 14        |
Safari  | Unknown   | Unknown      | 6         |
Opera   | Unknown   | Unknown      | 15        |
