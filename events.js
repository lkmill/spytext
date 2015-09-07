/**
 * Events for SpytextField view
 *
 * @module spytext/events
 */

var selectron = require('./selectron');
var commands = require('./commands');

var sectionTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];      

module.exports = {
	/**
	 * The keyup event listeners only listens to navigation keys.
	 * After a navigation key has been pressed, update the position in snapback
	 */
	keypress: function(e) {
		//The keypress event is fired when a key is pressed down and that key normally produces a character value (use input instead).
		// Firefox will fire keypress for some other keys as well, but they will have charCode === 0.

		if(e.charCode > 0 && e.charCode !== 13) {
			// Shift+Enter is pressed... let browsers handle it natively. NOTE: Safari does not insert BR on Shift+Enter

			e.preventDefault();
			var rng = selectron.range(),
				offset = rng.startOffset,
				container = rng.startContainer,
				c = String.fromCharCode(e.charCode);

			if(container.nodeType === 3) {
				container.textContent = container.textContent.slice(0,offset) + c + container.textContent.slice(offset);
				offset++;
			} else {
				container = document.createTextNode(c);
				rng.insertNode(container);
				offset = 1;
			}
			selectron.set({
				ref: container,
				offset: offset
			});
		}
	},
	keyup: function(e) {
		// TODO make sure we cover all different kinds of navigation keys, such as
		// home and end
		switch(e.keyCode) {
			case 33:
			case 34:
			case 35:
			case 36:
			case 37:
			case 38:
			case 39:
			case 40:
				// navigation keys... set new (initial) position in snapback
				// clear timeout (if any) and register undo (if any) will already have been done in keydown
				selectron.update();
				this.snapback.storePositions();
				this.toolbar.setActiveStyles();
				break;
		}
	},

	/**
	 * The keydown event listeners are used to override default behaviours
	 * in the contentEditable elements
	 */
	keydown: function(e) {
		// simple helper function to determine if a number is inbetween two values
		function inbetween(a, b) {
			var num = e.keyCode;
			var min = Math.min(a,b);
			var max = Math.max(a,b);
			return num >= min && num <= max;
		}

		if (e.ctrlKey || e.metaKey) {
			// prevent all ctrl key bindings
			// NOTE paste events are handled directly
			switch(e.keyCode) {
				case 66://b
				case 73://i
				case 85://u
					e.preventDefault();
					var arr = [];
					arr[66] = 'strong';
					arr[73] = 'em';
					arr[85] = 'u';
					this.command('format', arr[e.keyCode]);
					break;
				case 89://y
					e.preventDefault();
					this.snapback.redo();
					this.toolbar.setActiveStyles();
					break;
				case 90://z
					e.preventDefault();
					if(e.shiftKey) {
						this.snapback.redo();
					} else {
						this.snapback.undo();
					}
					this.toolbar.setActiveStyles();
					break;
				case 65://a
					e.preventDefault();
					selectron.select(this.el);
					selectron.update();
					this.snapback.storePositions();
					this.toolbar.setActiveStyles();
					break;
			}
		} else {
			var rng = selectron.range();

			if(rng && !rng.collapsed && (e.keyCode === 8 || e.keyCode === 46 || e.keyCode === 13 || inbetween(65, 90) || inbetween(48, 57) || inbetween(186, 222) || inbetween(96, 111))) {
				// the range is not collapsed, IE the user has selected some text AND
				// a manipulation button has been pressed. We delete the range contents, but
				// only preventDefault if backspace or delete.
				// not sure if we really need to register snapback... should already
				// have been sorted on mouseup events when user made the selection
				this.snapback.register();
				this.command('deleteRangeContents',rng);

				if(e.keyCode === 8 || e.keyCode === 46) {
					// if backspace or delete only delete the range contents. do nothing more
					return e.preventDefault();
				}
			}

			// By now we never have a non-collapsed range
			switch(e.keyCode) {
				case 33:
				case 34:
				case 35:
				case 36:
				case 37:
				case 38:
				case 39:
				case 40:
					// navigation keys... clear timeout (if any) and register undo (if any)
					// position of selection will be a set on keyup
					clearTimeout(this.timeout);
					this.snapback.register();
					return;
				case 8: //backspace
				case 46: // delete
					var section = $(rng.startContainer).closest(sectionTags.join(','))[0];

					// join lines if backspace and start of section, or delete and end of section
					if(e.keyCode === 8 && selectron.isAtStartOfSection(section)) {
						// backspace at the start of a section, join with previous
						e.preventDefault();
						this.command('joinPrev', section);
					} else if(e.keyCode === 46 && selectron.isAtEndOfSection(section)) {
						// delete and at the end of section, join with next
						e.preventDefault();
						this.command('joinNext', section);
					}
					break;
				case 13:
					if(!e.shiftKey) {
						// only override default behaviour if shift-key is not pressed. all
						// tested browser seems to do correct behaviour for Shift-Enter, namely
						// insert a <BR>
						e.preventDefault();
						commands.newline(this.el);
					}
					break;
			}

			// only register an undo if user has not typed for 300 ms
			clearTimeout(this.timeout);
			this.timeout = setTimeout(function() {
				this.snapback.register();
				this.toolbar.setActiveStyles();
			}.bind(this), 300);
		}
	},

	paste: function (e) {
		e.preventDefault();

		// handle jQuery events	
		if(e.originalEvent) 
			e = e.originalEvent;

		this.command('paste', e.clipboardData ? e.clipboardData : clipboardData);
	}
};
