# Spytext - The Tiny But Fully Functional RTE for the Web

Always the seer is a __sayer__. Somehow his dream is told: somehow he publishes it
with solemn joy: sometimes with pencil on canvas: sometimes with chisel on
stone; sometimes in towers and aisles of granite, his soul's worship is
builded; sometimes in anthems of indefinite music; but clearest and most
permanent, in words. 
- Ralph Waldo Emerson

## Why ?

Simply because there are no other really good, bare-bone text editors using
`contentEditable`. Most browsers behave very differently in handling line
breaks, new sections, backspaces, deletes, formatting etc. So basically we
have overriden all these actions with our own DOM manipulating actions.  The
only things we use native actions for is actual typing and text traversal
(arrow buttons, page up, etc). Even the undo/redo has been completely replaced
to allow us to modify the DOM however we like, but still be able to go back
to previous changes. This might sound like a daunting task, but it turned out
to be quite simple. And thus it is also very small, just look below.

## Functionality

+ Styling text with italic, bold, underline or strike-trough
+ Change between P, H1, H2, H3, H4, H5 and H6 blocks for text
+ Align/justify text blocks
+ Create ordered and unordered lists
+ Indent/outdent these lists and
+ Undo/redo

## Spytext is Tiny

Spytext depends on having jQuery and Underscore/Lodash available in global
scope. Other than that, no dependencies and the sizes are follwing:

          | Minified  | Compressed
----------|-----------|-----------
Spytext   | 24.4kb    | 7.51kb    


## Compatability

        | Quirky    | Without Undo | Full      |
--------|-----------|--------------|-----------|
Chrome  |         9 | 16           | 18        |
IE      |       N/A | 9            | N/A       |
Firefox |         1 | 3.6          | 14        |
Safari  | Unknown   | Unknown      | 6         |
Opera   | Unknown   | Unknown      | 15        |
