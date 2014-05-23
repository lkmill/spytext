/*
 * Cedit, a contenteditable library for javascript
 */

var mainFnc = function($, _, rangy) {
	var debug = true;
	var site_url = 'http://localhost:3000/';
	var base_class = 'cedit-';
	var bar_class = base_class+'button-bar';
	var group_class = base_class+'button-group';
	var wrapper_class = base_class+"wrapper";
	var has_dropdown_class = base_class+"has-dropdown";
	var dropdown_class = base_class+"dropdown";
	var element_class = base_class+"element";
	var templates = {
		'button': _.template(
			'<li>'+
				'<a id="'+base_class+'btn-<%= id %>" title="<%= title %>" href="#" class="cedit-button" tabIndex="-1">'+
					'<% if(icon){ %> <i class="fa fa-<%= icon %>"></i> <% } %>'+
					'<% if(text){ %> <%=text%> <% } %>'+
				'</a>'+
			'</li>'
		),
		'dropdown': _.template('<ul class="'+dropdown_class+'"></ul>'),
		'wrapper': _.template("<div class='"+wrapper_class+"'></div>"),
		'buttonBar': _.template("<div class='"+bar_class+" <%= position %>'></div>"),
		'buttonGroup': _.template('<ul class="'+group_class+'"></ul>')
	};
	var _fncs = {
		show_link_dialog: function(){
			var sel = rangy.getSelection();
			var el = getSurroundingNode();

			var href = "http://";
			if(el.tagName === "A" || el.tagName === "a"){
				var range = rangy.createRange();
				range.setStartBefore(el);
				range.setEndAfter(el);
				href = el.attributes.href.value;
				sel.setSingleRange(range);
			}
			var result = prompt("Link address:", href);

			if(result !== ""){
				document.execCommand("createLink", null, result);
			}else{
				document.execCommand("unlink");
			}
			
		},
		indent: function(){
			//document.execCommand("indent");
			var el = getSurroundingNode();
			var li = $(el).closest("li");
			var prev_li = $(li).prev("li");

			if( prev_li.size() == 1 && li.length > 0 ){
				$(li).remove();
				var new_ul = $("<ul></ul>");
				new_ul.append(li);
				prev_li.append(new_ul);
			}
		},
		show_image_dialog: function(){
			console.log("show_image_dialog");
		},
		show_html: function(){
			alert( Cedit.getCurrentElement().html() );
		},
		reset: function(toolbar){
			var orig_elem = toolbar.content || Cedit.elements;
			$(orig_elem).each(function(i, el){
				if(hasChanged(el)){
					selectNodeContents(el);
					document.execCommand("insertHTML", null, el.orig_html);
				}
			});
		},
		save: function(toolbar){
			var el = toolbar.config.content || Cedit.elements;
			_hooks.save(el, _fncs.saveAfter);
		},
		saveAfter: function(result){
			if(result.errNr){
				Cedit.showSuccess(result.msg || "Successfully saved");
			}else{
				Cedit.showError(result.msg || "Unable to save");
			}
			_.each(Cedit.elements, function(el){
				hasChanged(el);
			});
		},
		remove: function(toolbar){
			var el = toolbar.config.content || Cedit.elements;
			_hooks.remove(el, _fncs.removeAfter);
		},
		removeAfter: function(result){
			if(result.errNr){
				Cedit.showSuccess(result.msg || "Successfully removed");
			}else{
				Cedit.showError(result.msg || "Unable to remove");
			}
			//Cedit.elements.splice();
		},
		removeFormat: function(){
			document.execCommand("removeFormat");
		}
	};

	var _hooks = {
		save: function(elements, callback){ callback({errNr:0}) },
		remove: function(elements, callback){ callback({errNr:0}) }
	}

	var buttons = {
		undo: {id: "undo", title:"Undo", icon: "undo", cmd:"undo"},
		redo: {id: "redo", title:"Redo", icon: "repeat", cmd:"redo"},
		removeFormat: {id: "removeFormat", title:"Remove formatting", icon: "eraser", fnc:"removeFormat"},
		type: {id: "type", title:"Font type", text: "Type", dropdown: [
			{text: "Paragraph", cmd:"formatBlock", attr: "<p>"},
			{text: "Heading 1", cmd:"formatBlock", attr: "<H1>"}, 
			{text: "Heading 2", cmd:"formatBlock", attr: "<H2>"}, 
			{text: "Heading 3", cmd:"formatBlock", attr: "<H3>"}, 
			{text: "Heading 4", cmd:"formatBlock", attr: "<H4>"}, 
			{text: "Heading 5", cmd:"formatBlock", attr: "<H5>"}, 
			{text: "Heading 6", cmd:"formatBlock", attr: "<H6>"}
		]},
		strikethrough: {id: "strikethrough", title:"Strikethrough", icon: "strikethrough", cmd:"strikeThrough"},
		underline: {id: "underline", title:"Underline", icon: "underline", cmd:"underline"},
		bold: {id: "bold", title:"Bold", icon: "bold", cmd:"bold"},
		link: {id: "link", title:"Link", icon: "link", fnc: "show_link_dialog"},
		align: {id: "align", title:"Align", icon: "align-left", dropdown: [
			{title: "Align left", icon: "align-left", cmd:"justifyLeft"},
			{title: "Align center", icon: "align-center", cmd:"justifyCenter"},
			{title: "Align both", icon: "align-justify", cmd:"justifyFull"},
			{title:" Align right", icon: "align-right", cmd:"justifyRight"}
		]},
		'list-ul': {id: "list-ul", title:"Unordered list", icon: "list-ul", cmd:"insertUnorderedList"},
		'list-ol': {id: "list-ol", title:"Ordered list", icon: "list-ol", cmd:"insertOrderedList"},
		'indent-right': {id: "indent-right", title:"Indent", icon: "indent", fnc: "indent"},
		'indent-left': {id: "indent-left", title:"Unindent", icon: "outdent", cmd:"outdent"},
		image: {id: "image", title:"Image", icon: "picture", fnc: "show_image_dialog"},
		html: {id: "html", title:"Show html", icon: "code", fnc: "show_html"},
		reset: {id: "reset", title:"Reset", icon:"backward", fnc: "reset"},
		remove: {id: "remove", title:"Delete", icon: "trash", fnc: "remove"},
		save: {id: "save", title:"Save", icon: "save", fnc: "save"}
	};

	var buttonDefaults = {id: false, title: false, text:false, icon:false, fnc: false, cmd: false, dropdown: false};

	var Cedit = {
		toolbars: [],
		elements: [],
		defaultConfig: {
			noToolbar: false,
			preventFormattedPaste: true,
			preventTextOutsideParagraph: true	
		},
		addHooks: function(h){
			_.extend(_hooks, h);
		},
		addElements: function(elements, conf){
			var _this = this;
			conf = conf || {};
			_.defaults(conf, Cedit.defaultConfig);

			_.each(elements, function(el){
				var c = _.clone(conf);
				c.content = $(el);
				$(el).addClass(element_class);
				updateHash(el);
				
				$(el).on("blur", function(){
					hasChanged(this);
				});

				if(!conf.noToolbar){
					var toolbar = _this.createToolbar(c);
				}
				_this.elements.push(el);

			});

			if(conf.preventFormattedPaste) preventFormattedPaste(elements);
			if(conf.preventTextOutsideParagraph) preventTextOutsideParagraph(elements);
		},
		createToolbar: function(conf){
			var t = new CeditToolbar(conf);
			this.toolbars.push(t);
			return t;
		},
		getToolbarFromEl: function(el){
			return _.find(this.toolbars, function(t){ 
				return t.el.is(el); 
			});
		},
		showSuccess: function(text){
			var dialog = $('<div class="cedit-success">'+text+'</div>');
			$('body').append(dialog);
		},
		showError: function(text){
			var dialog = $('<div class="cedit-error">'+text+'</div>');
			$('body').append(dialog);
		},
		getCurrentElement: function(){
			return $(document.getSelection().baseNode).closest($(this.elements));
		}
	};


	var CeditToolbar = function(conf){
		var _this = this;
		this.config = {};
		this.buttons = []; 
		var presetConf = CeditToolbar.presets[conf.preset];
		if( typeof presetConf === "undefined" ) throw "Cedit - No preset found named: "+conf.preset;

		_.defaults(conf || {}, presetConf, CeditToolbar.defaultConfig);
		_.defaults(conf.fncs, CeditToolbar.defaultConfig.fncs);

		this.set(conf);
	};
	CeditToolbar.defaultConfig = {
		preset: 'custom',
		position: 'above-content', // above-content or top-fixed
		buttons: [],
		show: false,
		content: false,
		fncs: _fncs
	}
	CeditToolbar.presets = {
		'top-fixed-default': {
			buttons: [
				["undo","redo","removeFormat"],
				["type"],
				["strikethrough","underline","bold"],//,"color"],
				["link"],
				//["image"],
				["align"],
				["list-ul","list-ol"],
				//["indent-right","indent-left"],
				//["html"],
				["reset", "save"]
			],
			show : true,
			position: "top-fixed"
		},
		'simple': { buttons: [["undo","redo"],["link"],["html"],["save"]] },
		'simpleWithRemove': { buttons: [["undo","redo"],["link"],["html"],["remove"],["save"]] },
		'bare': { buttons: [["undo","redo"]] }
	};

	CeditToolbar.prototype = {
		_createButton: function(btn){
			var _this = this;
			if(typeof btn == "string"){
				if(typeof buttons[btn] === "undefined"){
					throw "Found no button with name: "+btn;
				}else{
					btn = buttons[btn];
				}
			}
			_.defaults(btn, buttonDefaults);
			var el = $( templates.button(btn) );
			el.children(".cedit-button").click( _.bind(this.onBtnClick, this, btn) );

			if(btn.dropdown){
				el.addClass( has_dropdown_class );
				var ul = $( templates.dropdown() );
				_.each(btn.dropdown, function(d_btn, i){
					d_btn.id = i;
					_.defaults(d_btn, buttonDefaults);
					var d_el = $( templates.button(d_btn) );
					d_el.children(".cedit-button").click( _.bind(_this.onBtnClick, _this, d_btn) );
					ul.append( d_el );
				});
				el.append(ul);
			}
			return el;
		},
		show: function(){ 
			var _this = this;
			this.el.show(); 

			// add margin to body so that top-fixed toolbars won't cover content
			if(this.config.position == "top-fixed" && $("body").css('margin-top') != this.el.outerHeight()+"px"){
				$("body").css('margin-top', function (index, curValue) {
					return parseInt(curValue, 10) + _this.el.outerHeight() + 'px';
				});
			}
		},
		hide: function(){ 
			var _this = this;
			this.el.hide(); 

			// remove margin from body
			if(this.config.position == "top-fixed" && $("body").css('margin-top') == this.el.outerHeight()+"px"){
				$("body").css('margin-top', function (index, curValue) {
					return parseInt(curValue, 10) - _this.el.outerHeight() + 'px';
				});
			}
		},
		set: function(conf){
			var _this = this;
			var conf = conf || {};
			_.extend(this.config, conf);

			if(conf.position){
				this.el = $( templates.buttonBar({position: conf.position}) );
			} 

			if(conf.content){
				this.el.width(conf.content.outerWidth());
				conf.content.before(this.el);
				conf.content.on("focus", _.bind(this.onContentFocus, this));
				conf.content.on("blur", _.bind(this.onContentBlur, this));
				if(conf.position == "above-content"){
					this.el.wrap( templates.wrapper() );
				}
			}else{
				$("body").prepend(this.el);
			}

			if(conf.buttons){
				$.each(conf.buttons, function(i, group){
					_this.addButtonGroup(group);
				});	
			}
			
			if(conf.show){ this.show(); } else { this.hide(); }

			this.el.on("mousedown", function(ev){ 
				ev.preventDefault();
				if( conf.content ) conf.content.focus(); 
			});
		},
		addButtonGroup: function(btns){
			var _this = this;
			this.buttons.push(btns);
			var ul = $( templates.buttonGroup() );
			$.each(btns, function(i, b){
				ul.append( _this._createButton(b) );
			});
			_this.el.append(ul);
		},
		onContentBlur: function(event, original_event){
			this.hide();
		},
		onContentFocus: function(event){
			this.show();
		},
		onBtnClick: function(btn, event){ // executed in clicked link context
			console.log("button clicked", btn);
			event.preventDefault();
			if(btn.fnc){
				var f = btn.fnc;
				if(typeof btn.fnc === "string") f = this.config.fncs[btn.fnc];
				_.bind(f, this, this, event, btn)();
			}else if(btn.cmd){
				document.execCommand(btn.cmd, null, btn.attr);
			}
		},
	};


	// ############## HELPER FUNCTIONS ##############

	function getSurroundingNode(){
		return rangy.getSelection().focusNode.parentElement;
	}

	// Create custom beforeblur event
	var lastFocus = false;
	var isBeforeBlurAdded = false;
	function addBeforeBlurEvent(selectorOrObject){
		if(!isBeforeBlurAdded){
			isBeforeBlurAdded = true;
			$("*").on("keydown", function(event){
				if(lastFocus && event.which == 9){
					lastFocus.trigger("beforeblur", event);
					lastFocus = false;
				}
			});
		}

		$(selectorOrObject).focus(function(event){
			lastFocus = $(this);
		});

		$("body").on("mousedown", function(event){
			if( lastFocus && lastFocus.filter(selectorOrObject).size() > 0 ){
				if( $(event.target).closest(lastFocus).size() == 0){
					console.log("beforeblur", lastFocus[0]);
					lastFocus.trigger("beforeblur", event);
					lastFocus = false;
				}
			}
		});
	}

	function preventFormattedPaste(selectorOrObject){
		// prevent formatted paste
		$(selectorOrObject).on("paste", function(ev){ 
			var _this = this;
			var textarea = $("<input type='text' style='position: absolute; left: -1000px; top:-1000px;'></input>");

			var selBefore = rangy.saveSelection();

			$('body').append(textarea);
			textarea.focus();
			setTimeout(function() {
				document.execCommand("removeFormat");
				$(_this).focus();
				rangy.restoreSelection(selBefore);
				rangy.removeMarkers(selBefore);
				document.execCommand("insertHTML", false, textarea.val());
				wrapEmptyTextnodes(_this);
				textarea.remove();
			}, 1);
		});
	}

	function preventTextOutsideParagraph(selectorOrObject){
		var keydownBefore = false;
		$(selectorOrObject).on("keydown", function(ev){
			keydownBefore = true;
		});
		$(selectorOrObject).on("DOMNodeInserted", function(ev){
			if(ev.target == this && keydownBefore){
				wrapEmptyTextnodes(this);
			}
			keydownBefore = false;
		});
	}

	function cleanup(el){
		wrapEmptyTextnodes(el);
	}

	function wrapEmptyTextnodes(el){
		var contents = $(el).contents();
		contents.filter(function() {return this.nodeType === 3;}).wrap( "<p></p>" );
		contents.filter( "br" ).remove();
		setCaretAtEndOfElement( $(el).find("p").last()[0] );
	}

	// prevent leaving page without saving
	window.onbeforeunload = function() {
		var changed = false;
		_.each(Cedit.elements, function(el){
			if(hasChanged(el)){
				changed = true;
				$(el).focus();
			}	
		});
		return changed ? "Some data hasn't been saved. If you leave the page now all unsaved changes will be lost." : null;
	};

	// calculate the hash of an element. Used to determine if an element has changed
	function updateHash(element){
		$(element).attr("data-startHash", simpleHash($(element).html()));
		element.orig_html = $(element).html();
	}

	// determine if an element has changed
	function hasChanged(element){
		if($(element).attr("data-startHash") != simpleHash($(element).html())){
			$(element).addClass("changed");
			return true;
		}else{
			$(element).removeClass("changed");
			return false;
		}
	}

	// calculate the hash of an element
	function simpleHash(str){
		var hash = 0;
		if (str.length == 0) return hash;
		for (i = 0; i < str.length; i++) {
			char = str.charCodeAt(i);
			hash = ((hash<<5)-hash)+char;
			hash = hash & hash; // Convert to 32bit integer
		}
		return hash;
	}

	function selectNodeContents(el){
		var range = rangy.createRange();
		range.selectNodeContents(el);
		var sel = rangy.getSelection();
		sel.setSingleRange(range);
	}

	function setCaretAtEndOfElement(element){
		var selection = rangy.getSelection();
		var range = rangy.createRange();
		range.setStartAfter(element);
		range.setEndAfter(element);
		selection.removeAllRanges();
		selection.addRange(range);
	}

	window.Cedit = Cedit;

	$(function(){
		/*var t = Cedit.createToolbar();
		t.addButtonGroup(["undo", "redo"]);
		t.addButtonGroup(["removeFormat"]);
		t.addButtonGroup(['type']);
		t.addButtonGroup(["strikethrough", "underline", "bold"]);
		t.addButtonGroup(["link"]);
		t.addButtonGroup(['list-ul', 'list-ol']);
		t.addButtonGroup(['align', 'indent-right', 'indent-left']);
		t.addButtonGroup(["image", "html"]);
		t.addButtonGroup(["save"]);
		//t.hide();

		$('[contenteditable]').each(function(){
			var t = Cedit.createToolbar({position: 'above-content', content: $(this), show: false});
			t.addButtonGroup(['type']);
			t.addButtonGroup(["link"]);
			t.addButtonGroup(["html"]);
			t.addButtonGroup(["remove"]);
			t.addButtonGroup(["save"]);
		});
		*/
		if(debug){
			window.CeditToolbar = CeditToolbar;
			window.addBeforeBlurEvent = addBeforeBlurEvent;
			window.setCaretAtEndOfElement = setCaretAtEndOfElement;
		}
	});
}


// Initialize Cedit so it can be used both with requirejs and as a standalone
if(typeof define != "undefined"){
	define(['jquery', 'lodash', 'rangy'], mainFnc);
}else{
	mainFnc($, _, rangy);
};
