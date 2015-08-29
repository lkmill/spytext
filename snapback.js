var selectron = require('./selectron');

var Snapback = function(element, config) {
	var MO = typeof MutationObserver !== 'undefined' ? MutationObserver : (typeof WebKitMutationObserver !== 'undefined' ? WebKitMutationObserver : undefined);

	if(!MO) return;

	var _snapback = this;

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

	setPosition: function(position) {
		return (this.position = position || selectron.get(this.element));
	},

	enable: function() {
		if(!this.enabled) {
			this.observer.observe(this.element, this.config);
			this.enabled = true;
		}
	},

	disable: function() {
		if(this.enabled) {
			this.observer.disconnect();
			this.enabled = false;
		}
	},

	undo: function() {
		if(this.enabled && this.undoIndex >= 0) {
			this.undoRedo(this.undos[this.undoIndex--], true);
		}
	},

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
