# Spytext - The Tiny But Fully Functional RTE for the Web

Currently very buggy, but only due to massive refactoring.  And more
refactoring is going to be needed. But soon. Ish.  Hopefully by the middle of
summer 2015 this will be ready in all of its glory.

And now for a quote to distract you from the mess.

Always the seer is a __sayer__. Somehow his dream is told: somehow he publishes it
with solemn joy: sometimes with pencil on canvas: sometimes with chisel on
stone; sometimes in towers and aisles of granite, his soul's worship is
builded; sometimes in anthems of indefinite music; but clearest and most
permanent, in words. 
- Ralph Waldo Emerson

## Why ?

Simply because there are no other really good, bare-bone text editors using
`contentEditable`. Most browsers behave very differently in handling
line breaks, new blocks, backspaces, deletes, formatting etc. So basically
we have overriden all these actions with our own DOM manipulating actions.
The only things we use native actions for is actual typing and text traversal (arrow buttons,
page up, etc). Even the undo/redo has been completely replaced to allow us to modify
the DOM howerver we like, but still be able to go back to previous changes.
This might sound like a daunting task, but it turned out to be quite simple.
And thus it is also very small, just look below.

Current functions are styling text with italic, bold or underline. Change
between P, H1, H2, H3, H4, H5 and H6 blocks for text. Create ordered and
unordered lists and undo/redo (in the seperate module snapback).

## Spytext is Tiny

          | Minified  | Compressed
----------|-----------|-----------
Spytext   | 21kb      | 6.56kb    


## Compatability

        | Quirky    | Without Undo | Full      |
--------|-----------|--------------|-----------|
Chrome  |         9 | 16           | 18        |
IE      |       N/A | 9            | N/A       |
Firefox |         1 | 3.6          | 14        |
Safari  | Unknown   | Unknown      | 6         |
Opera   | Unknown   | Unknown      | 15        |


## Known Issues

Calling newline in a section that contains BR's might produce weird results. Especially
if there are trailing BR's.

Calling newline at end of list item with nested list and first list item in nested list
is empty also does weird things.
