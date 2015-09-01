/**
 * Snapback is a DOM undo and redo library. It uses
 * a MutationObserver to observe changes to a DOM Element's sub tree.
 * When at least one mutation has been stored in the mutations array,
 * these mutations can be grouped together and saved as an undo.
 * Snapback can then be used to traverse back and forth in the undo history.
 *
 * @module spytext/snapback 
 */

/**
 * An Undo item contains several MutationRecords (records of changes to the DOM in chronological order)
 * and the positions of the selection caret's before and after the mutations.
 *
 * @typedef {Object} Undo
 * @property {Object} positions - Reference node to count `offset` from
 * @property {Positions} positions.before - The position of the selection before the first mutation
 * @property {Positions} positions.after - The position of the selection after the last mutation in the undo
 * @property {MutationRecord[]} positions.mutations - An array of all the mutations for the undo
 */

var selectron = require('./selectron');

/**
 * @constructor
 * @alias module:spytext/snapback
 * @param {Element} element - The element used as the root for the MutationObserver and root for selectron
 **/
var Snapback = function(element) {
	var MO = typeof MutationObserver !== 'undefined' ? MutationObserver : (typeof WebKitMutationObserver !== 'undefined' ? WebKitMutationObserver : undefined);

	if(!MO) return;

	var _snapback = this;

	// bind `this` to the instance snapback instance inside addMutation,
	// see line 50
	_.bindAll(_snapback, 'addMutation');

	_.extend(_snapback, {
		config: { subtree: true, attributeFilter: [ 'style' ], attributes: true, attributeOldValue: true, childList: true, characterData: true, characterDataOldValue: true },
		element: element,
		undos: [],
		mutations: [],
		undoIndex: -1,
		enabled: false
	});

	_snapback.observer = new MO(function(mutations) {
		mutations.forEach(_snapback.addMutation);    
	});
};

Snapback.prototype = {
	/**
	 * Adds a mutation to the mutation array
	 *
	 * @param	{MutationRecord} mutation - The mutation to the mutations array
	 */
	addMutation: function(mutation) {
		switch(mutation.type) {
			case 'characterData': 
				mutation.newValue = mutation.target.textContent;
				var lastIndex = this.mutations.length - 1,
					lastMutation = this.mutations[lastIndex];

				if(lastIndex > -1 && lastMutation.type === 'characterData' && lastMutation.target === mutation.target && lastMutation.newValue === mutation.oldValue) {
					this.mutations[lastIndex].newValue = mutation.newValue;
				} else {
					this.mutations.push(mutation);
				}

				break;
			case 'attributes':
				mutation.newValue = mutation.target.getAttribute(mutation.attributeName);
				this.mutations.push(mutation);
				break;
			case 'childList':
				this.mutations.push(mutation);
				break;
		}
	},

	/**
	 * Redo (if we are not already at the newest change)
	 */
	redo: function() {
		if(this.enabled && this.undoIndex < this.undos.length - 1) {
			this.undoRedo(this.undos[++this.undoIndex], false);
		}
	},

	register: function() {
		if(this.enabled && this.mutations.length > 0) {
			if(this.undoIndex < this.undos.length - 1) {
				this.undos = this.undos.slice(0, this.undoIndex + 1);
			}

			this.undos.push({
				positions: {
					before: this.position,
					after: this.setPosition()
				},
				mutations: this.mutations
			});
			this.mutations = [];
			this.undoIndex = this.undos.length -1;
		} else {
			this.setPosition();
		}
	},

	/**
	 * Save positions of current selection
	 */
	setPosition: function(position) {
		return (this.position = position || selectron.get(this.element));
	},

	/**
	 * Start observering mutations to the DOM
	 */
	enable: function() {
		if(!this.enabled) {
			this.observer.observe(this.element, this.config);
			this.enabled = true;
		}
	},

	/**
	 * Stop observering mutations to the DOM
	 */
	disable: function() {
		if(this.enabled) {
			this.observer.disconnect();
			this.enabled = false;
		}
	},

	/**
	 * Unfo (if we are not already at the oldest change)
	 */
	undo: function() {
		if(this.enabled && this.undoIndex >= 0) {
			this.undoRedo(this.undos[this.undoIndex--], true);
		}
	},

	/**
	 * Goes through a Undo items mutations and either does them
	 * or undos them
	 *
	 * @param {Object} undo
	 */
	undoRedo: function(undo, isUndo) {
		this.disable();

		if(this.mutations.length > 0) {
			this.register();
		}
		
		var mutations = isUndo ? undo.mutations.slice(0).reverse() : undo.mutations,
			position = isUndo ? undo.positions.before : undo.positions.after;

		for(var s = 0; s < mutations.length; s++) {
			var mutation = mutations[s];
			switch(mutation.type) {
				case 'characterData':
					mutation.target.textContent = isUndo ? mutation.oldValue : mutation.newValue;
					break;
				case 'attributes':
					$(mutation.target).attr(mutation.attributeName, isUndo ? mutation.oldValue : mutation.newValue);
					break;
				case 'childList':
					var addNodes = isUndo ? mutation.removedNodes : mutation.addedNodes,
						removeNodes = isUndo ? mutation.addedNodes : mutation.removedNodes;

					for(var j = 0; j < addNodes.length; j++) {
						if (mutation.nextSibling) {
							$(mutation.nextSibling).before(addNodes[j]);
						} else {
							$(mutation.target).append(addNodes[j]);
						}
					}
					$(removeNodes).remove();
					break;
			}
		}

		selectron.set(position);

		this.enable();
	}
};

module.exports = Snapback;
