/**
 * Events for SpytextField view
 *
 * @module spytext/events
 */

var selectron = require('./selectron');
var commands = require('./commands');

var blockTags = [ 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI' ];      

module.exports = {
	/**
	 * The keyup event listeners only listens to navigation keys.
	 * After a navigation key has been pressed, update the position in snapback
	 */
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
				this.snapback.getPositions();
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

		if (e.ctrlKey) {
			// prevent all ctrl key bindings
			e.preventDefault();
			// NOTE paste events are handled directly
			switch(e.keyCode) {
				case 66://b
				case 73://i
				case 85://u
					var arr = [];
					arr[66] = 'strong';
					arr[73] = 'em';
					arr[85] = 'u';
					this.command('format', arr[e.keyCode]);
					break;
				case 89://y
					this.snapback.redo();
					break;
				case 90://z
					this.snapback.undo();
					break;
				case 65://a
					selectron.select(this.el);
					this.snapback.getPositions();
					break;
			}
		} else {
			var rng = selectron.range();

			if(rng && !rng.collapsed && (e.keyCode === 8 || e.keyCode === 46 || e.keyCode === 13 || inbetween(65, 90) || inbetween(48, 57) || inbetween(186, 222) || inbetween(96, 111))) {
				this.snapback.register();
				this.command('deleteRangeContents',rng);

				if(e.keyCode === 8 || e.keyCode === 46) {
					// if backspace or delete only delete the range contents. do nothing more
					return e.preventDefault();
				}
				// if not backspace or delete we let the rest of the logic happen. if
				// the selection was not collapsed we want for example a to be inserted after
				// the range contents are cleared if the a button was pressed
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
					var block = $(rng.startContainer).closest(blockTags.join(','))[0];

					var position = selectron.get(block);
					
					// join lines if backspace and start of block, or delete and end of block
					if(e.keyCode === 8 && position.start.offset === 0) {
						// backspace at the start of a block, join with previous

						e.preventDefault();
						this.command('joinPrev', block);
					} else if(e.keyCode === 46) {
						// 46 === delete
						var nestedList = $(block).children('UL,OL');

						if(nestedList.length === 0 && position.start.offset === position.start.ref.textContent.length ||
								nestedList.length === 1 && position.start.offset === position.start.ref.textContent.length - nestedList.text().length) {
							// delete and at the end of block, join with next
							e.preventDefault();
							this.command('joinNext', block);
						}
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
