/**
 * A Backbone.View for Spytext fields. 
 *
 * @module spytext/toolbar 
 */

function mapToNodeName(node) {
	return node.nodeName;
}

var selectron = require('./selectron');

module.exports = {
	/**
	 * @lends SpytextToolbar.prototype
	 * @augments Backbone.View
	 */
	events: {
		'click button[data-command]': 'command',
		'click button[data-undo]': 'undo',
		'click button[data-redo]': 'redo',
		mousedown: function(e) {
			// this is needed to prevent toolbar from stealing focus
			e.preventDefault();
		}
	},

	template: 'spytext-toolbar',

	/**
	 * Activates or deactivates the toolbar depending on whether a spytext field
	 * is passed
	 */
	toggle: function(field) {
		this.field = field;
		this.$el.toggleClass('active', !!field);
	},

	undo: function() {
		this.field.snapback.undo();
		this.setActiveStyles();
	},

	redo: function() {
		this.field.snapback.redo();
		this.setActiveStyles();
	},

	setActiveStyles: function() {
		var _toolbar = this;
		var containedSections = selectron.contained(this.field.el, { sections: true }, true);

		var containedSectionTags = _.unique(containedSections.map(mapToNodeName));

		var containedLists = _.unique(containedSections.filter(function(node) {
			return node.nodeName === 'LI';
		}).map(function(node) {
			return $(node).closest(_toolbar.field.el.children)[0];
		}));

		var containedListTags = _.unique(containedLists.map(mapToNodeName));

		var containedBlocks = containedSections.filter(function(node) {
			return node.nodeName !== 'LI';
		});

		var containedBlockTags = _.unique(containedBlocks.map(mapToNodeName));

		$('button[data-command="list"]').removeClass('active');

		if(containedLists.length === 1) {
			$('button[data-command="list"][data-option="' + containedListTags[0].toLowerCase() + '"]').addClass('active');
		}

		var alignment = containedBlocks.reduce(function(result, block) {
			if(result === undefined) return result;

			var newResult = getComputedStyle(block).textAlign;

			if(newResult === 'start') newResult = 'left'; 

			if(result === null) result = newResult;

			return result === newResult ? newResult : undefined;
		}, null);

		$('button[data-command="align"]').removeClass('active');

		if(alignment)
			$('button[data-command="align"][data-option="' + alignment + '"]').addClass('active');

		$('.spytext-dropdown.block').each(function() {
			var ul = this;

			$(ul).removeClass('pseudo pseudo-list pseudo-multiple').find('> li').removeClass('active');
			
			if(containedListTags.length > 0) {
				$(ul).addClass('pseudo pseudo-list');
			} else if(containedBlockTags.length === 1) {
				$(ul).find('button[data-option="' + containedBlockTags[0].toLowerCase() + '"]').each(function() {
					$(this.parentNode).addClass('active');
				});
			} else if(containedBlockTags.length > 1) {
				$(ul).addClass('pseudo pseudo-multiple');
			}
		});

		var commonAncestor = selectron.range().commonAncestorContainer;
		if(commonAncestor.nodeType === 3) commonAncestor = commonAncestor.parentNode;
		var containedTextNodes = selectron.contained(commonAncestor, { nodeType: 3 }, true);

		this.$('button[data-command="format"]').each(function() {
			var tag = $(this).data('option');
			
			if(!tag) return;

			tag = tag.toUpperCase();

			$(this).toggleClass('active', containedTextNodes.length > 0 && containedTextNodes.every(function(node) {
				var ancestorTags = $(node).ancestors(null, _toolbar.field.el).toArray().map(mapToNodeName);
				return ancestorTags.indexOf(tag) > -1;
			}));
		});

		this.$('button[data-undo]').prop('disabled', this.field.snapback.undoIndex === -1);
		this.$('button[data-redo]').prop('disabled', this.field.snapback.undoIndex >= (this.field.snapback.undos.length - 1));
		this.$('button[data-command="indent"],button[data-command="outdent"]').prop('disabled', containedSectionTags.indexOf('LI') === -1);
		this.$('button[data-command="align"]').prop('disabled', _.without(containedSectionTags, 'LI').length === 0);
	},

	/**
	 * Calls a command on the field currently attached to the toolbar
	 */
	command: function(e) {
		var command = $(e.currentTarget).attr('data-command'),
			option = $(e.currentTarget).attr('data-option');
			
		this.field.command(command, option);
	}

};
