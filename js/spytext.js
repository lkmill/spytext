/*
 * SpyText, a contenteditable library for javascript
 */

var mainFunction = function ($, _) {
    var browser = getBrowser();
    if (!checkBrowser()) {
        alert('you are using an unsuppported browser');
    }

    var _siteUrl = 'http://localhost:3000/';
    var _baseClass = 'spytext-';
    var _barClass = _baseClass + 'button-bar';
    var _generatedClass = _baseClass + 'generated';
    var _groupClass = _baseClass + 'button-group';
    var _wrapperClass = _baseClass + 'wrapper';
    var _hasDropdownClass = _baseClass + 'has-dropdown';
    var _dropdownClass = _baseClass + 'dropdown';
    var _elementClass = _baseClass + 'element';
    var _templates = {
        button: _.template(
            '<li>' +
                '<a <% if(attribute){ %>data-attribute="<% attribute %>"<% } %>id="' + _baseClass + 'btn-<%= name %>" title="<%= title %>" href="#" class="' + _baseClass + 'button" tabIndex="-1">' +
                    '<% if(icon){ %> <i class="fa fa-<%= icon %>"></i> <% } %>' +
                    '<% if(text){ %> <%= text %> <% } %>' +
                '</a>' +
            '</li>'
        ),
        dropdownLi: _.template(
            '<li class="' + _hasDropdownClass + '">' +
                '<span title="<%= title %>" class="' + _baseClass + 'button" tabIndex="-1">' +
                    '<% if(icon){ %> <i class="fa fa-<%= icon %>"></i> <% } %>' +
                    '<% if(text){ %> <%= text %> <% } %>' +
                '</span>' +
            '</li>'
        ),
        dropdownUl: _.template('<ul class="' + _dropdownClass + '"></ul>'),
        wrapper: _.template('<div class="' + _wrapperClass + '"></div>'),
        buttonBar: _.template('<div class="' + _barClass + ' <%= position %>"></div>'),
        buttonGroup: _.template('<ul class="' + _groupClass + ' <%= name %>"></ul>')
    };
    var _commands = {
        align: function (attribute, textArea) {
            var command = 'justify' + attribute.charAt(0).toUpperCase() + attribute.slice(1).toLowerCase();
            document.execCommand(command);
        },
        formatBlock: function (attribute, textArea) {
            console.log('inside formatBlock');
            document.execCommand('formatBlock', null, attribute);
        },
        generic: function (command, attribute, textArea) {
            document.execCommand(command, null, attribute);
        },
        indent: function (attribute, textArea) {
            //document.execCommand("indent");
            var el = getSurroundingNode();
            var li = $(el).closest('li');
            var prevLi = $(li).prev('li');

            if (prevLi.size() === 1 && li.length > 0) {
                $(li).remove();
                var newUl = $('<ul></ul>');
                newUl.append(li);
                prevLi.append(newUl);
            }
        },
        remove: function (attribute, textArea) {
            var element = textArea.element;
            _hooks.remove(element, _commands.removeAfter);
        },
        removeAfter: function (attribute, result) {
            if (result.errNr) {
                SpyText.showSuccess(result.msg || 'Successfully removed');
            } else {
                SpyText.showError(result.msg || 'Unable to remove');
            }
        },
        removeFormat: function (attribute, textArea) {
            document.execCommand('removeFormat');
        },
        reset: function (attribute, textArea) {
            // TODO get textArea sent in from onClick
            if (textArea && textArea.hasChanged()) {
                selectNodeContents(textArea.element);
                document.execCommand('insertHTML', null, textArea.originalHTML);
            }
        },
        save: function (attribute, textArea) {
            var el = textArea.element;
            _hooks.save(el, _commands.saveAfter);
        },
        saveAfter: function (attribute, result) {
            // TODO make sure textArea gets passed in
            var textArea;
            if (result.errNr) {
                SpyText.showSuccess(result.msg || 'Successfully saved');
            } else {
                SpyText.showError(result.msg || 'Unable to save');
            }
            _.each(SpyText.elements, function (el) {
                textArea.hasChanged();
            });
        },
        showHtml: function (attribute, textArea) {
            alert(getCurrentElement().html());
        },
        showImageDialog: function (attribute, textArea) {
            console.log('showImageDialog');
        },
        showLinkDialog: function (attribute, textArea) {
            var sel = window.getSelection();
            var node = sel.focusNode.parentNode;
            if (node.tagName.toLowerCase() !== 'a') {
                node = sel.anchorNode.parentNode;
                if (node.tagName.toLowerCase() !== 'a') {
                    node = null;
                }
            }

            var href = 'http://';
            if (node) {
                var range = document.createRange();
                range.selectNodeContents(node);
                href = node.attributeibutes.href.value;
                sel.removeAllRanges();
                sel.addRange(range);
            }
            var result = prompt('Link address:', href);

            if (result !== '') {
                document.execCommand('createLink', null, result);
            } else {
                document.execCommand('unlink');
            }
            
        },
        undo: function (attribute, textArea) {
            document.execCommand('undo');
            if (browser.name.toLowerCase() === 'chrome') {
                $('p.' + _generatedClass).each(function () {
                    if (window.getSelection().focusNode !== this && $(this).text() === '') {
                        console.log('removing');
                        $(this).remove();
                    }
                });
            }
        }
    };

    var _hooks = {
        save: function (elements, callback) { callback({errNr: 0}); },
        remove: function (elements, callback) { callback({errNr: 0}); }
    };

    var _buttonTypes = {
        //undo: {id: 'undo', title: 'Undo', icon: 'undo', command: 'undo', global: true },
        undo: { title: 'Undo', icon: 'undo', command: 'undo', global: true },
        redo: { title: 'Redo', icon: 'repeat', command: 'redo', global: true },
        removeFormat: { title: 'Remove formatting', icon: 'eraser', command: 'removeFormat'},
        type: {  title: 'Font type', text: 'Type', command: 'formatBlock', dropdown: [
            { text: 'Paragraph', attribute: '<p>' },
            { text: 'Heading 1', attribute: '<H1>' },
            { text: 'Heading 2', attribute: '<H2>' },
            { text: 'Heading 3', attribute: '<H3>' },
            { text: 'Heading 4', attribute: '<H4>' },
            { text: 'Heading 5', attribute: '<H5>' },
            { text: 'Heading 6', attribute: '<H6>' }
        ]},
        strikethrough: { title: 'Strikethrough', icon: 'strikethrough', command: 'strikeThrough'},
        underline: { title: 'Underline', icon: 'underline', command: 'underline'},
        bold: { title: 'Bold', icon: 'bold', command: 'bold'},
        link: { title: 'Link', icon: 'link', command: 'showLinkDialog'},
        align: { title: 'Align', icon: 'align-left', command: 'align', dropdown: [
            { icon: 'align-left', attribute: 'left'},
            { icon: 'align-center', attribute: 'center'},
            { icon: 'align-justify', attribute: 'full'},
            { icon: 'align-right', attribute: 'right'}
        ]},
        'align-left': { title: 'Align Left', icon: 'align-left', command: 'align', attribute: 'left' },
        'align-center': { title: 'Align Center', icon: 'align-center', command: 'align', attribute: 'center' },
        'align-right': { title: 'Align Right', icon: 'align-right', command: 'align', attribute: 'right' },
        'align-justify': { title: 'Justify', icon: 'align-justify', command: 'align', attribute: 'full' },
        'list-ul': { title: 'Unordered list', icon: 'list-ul', command: 'insertUnorderedList'},
        'list-ol': { title: 'Ordered list', icon: 'list-ol', command: 'insertOrderedList'},
        'indent-right': { title: 'Indent', icon: 'indent', command: 'indent'},
        'indent-left': { title: 'Unindent', icon: 'outdent', command: 'outdent'},
        image: { title: 'Image', icon: 'picture', command: 'showImageDialog'},
        html: { title: 'Show html', icon: 'code', command: 'showHtml'},
        reset: { title: 'Reset', icon: 'backward', command: 'reset' },
        remove: { title: 'Delete', icon: 'trash', command: 'remove'},
        save: { title: 'Save', icon: 'save', command: 'save', global: true }
    };

    var _buttonDefaults = { title: false, text: false, icon: false, command: false, attribute: false, attributes: false, global: false };

    var SpyText = {
        singles: [],
        globals: [],
        groups: [],
        globalToolbar: undefined,
        addHooks: function (h) {
            _.extend(_hooks, h);
        },
        addSingle: function (element) {
            // TODO implement
            console.log('not implemented');
        },
        // adds text areas to the global toolbar
        addGlobals: function (elements, config) {
            // TODO implement
            console.log('not implemented');
        },
        addGroup: function (element) {
            var that = this;
            var toolbar = new SpyTextToolbar({ preset: 'group', parent: element });
            toolbar.disable();
            var elements = $(element).find('[data-name]').get();
            var textAreas = [];
            _.each(elements, function (el) {
                var textArea = new SpyTextArea(el, toolbar);
                textAreas.push(textArea);
            });
            var group = { toolbar: toolbar, textAreas: textAreas };
            this.groups.push(group);
            return group;
        },
        showSuccess: function (text) {
            var dialog = $('<div class="' + _baseClass + 'success">' + text + '</div>');
            $('body').append(dialog);
        },
        showError: function (text) {
            var dialog = $('<div class="' + _baseClass + 'error">' + text + '</div>');
            $('body').append(dialog);
        },
        // TODO check if the destroy methods can be improved
        destroyGlobals: function () {
            _.each(this.globals, function (textArea) {
                textArea.destroy();
            });
            this.globals.length = 0;
            this.globalToolbar.destroy();
            this.globalToolbar = undefined;

        },
        destroyGroup: function (group) {
            var index = this.groups.indexOf(group);
            if (index > -1) {
                _.each(group.textAreas, function (textArea) {
                    textArea.destroy();
                });
                group.textAreas.length = 0;
                delete group.textAreas;
                group.toolbar.destroy();
                delete group.toolbar;
                this.groups.splice(index, 1);
            }
        },
        destroySingle: function (single) {
            var index = this.singles.indexOf(single);
            if (index > -1) {
                single.textArea.destroy();
                delete single.textArea;
                single.toolbar.destroy();
                delete single.toolbar;
                this.singles.splice(index, 1);
            }
        }
    };

    var SpyTextArea = function (element, toolbar) {
        var that = this;
        this.toolbar = toolbar;
        this.element = element;
        this.addHooks = function (h) {
            _.extend(_hooks, h);
        };
        this.config = this.presets[$(element).data('preset')];
        _.defaults(this.config, this.defaultConfig);

        if (element.nodeName.toLowerCase() === 'div' && $(element).html().trim() === '') {
            $(element).html('<p><br /></p>');
        } else {
            $(element).html($(element).html().trim());
        }
        this.originalHTML = $(element).html();
        var fixing = false;

        if (element.nodeName.toLowerCase() !== 'div' || $(element).data('type') !== 'textarea') {
            turnOffNewLine(element);
        }
        // to make it easy to get access to the textArea
        element.textArea = this;
        $(element).addClass(_elementClass);
        $(element).focus(function () {
            console.log('focused');
            that.toolbar.enable(that.config.commands);
        });
        $(element).on('blur', function () {
            that.hasChanged();
            that.toolbar.disable();
        });
        $(element).on('keydown', function (e) {
            if (e.keyCode === 90) {
                e.preventDefault();
                _commands.undo(element.textArea);
            }
        });
        $(element).attr('contentEditable', 'true');
        $(element).on('DOMNodeInserted', function (e) {
            var sel, rng, content;
            if (fixing) return;
            fixing = true;
            if (e.target === element) {
                return;
            }
            var $parent = $(e.target).parent();
            var $newElement = $('<p class="' + _generatedClass + '"></p>');
            if (e.target.nodeName.toLowerCase() === 'div') {
                content = e.target.textContent !== '' ? e.target.textContent : '<br />';
                $newElement.html('<br />');
                $(e.target).after($newElement).remove();
                sel = window.getSelection();
                rng = document.createRange();
                rng.selectNode($newElement[0]);
                sel.addRange(rng);
                document.execCommand('insertHtml', false, content);
            } else if (e.target.nodeName.toLowerCase() === 'span') {
                if ($parent[0] === element) {
                    alert('oh my, span is child of the textArea!');
                    $newElement.append($(e.target).children());
                    $(e.target).remove();
                    $(this).append($newElement);
                    setCaretAtEndOfElement($newElement[0]);
                } else {
                    setCaretAtEndOfElement($parent[0]);
                    sel = window.getSelection();
                    rng = sel.getRangeAt(0);
                    content = e.target.textContent;
                    $(e.target).remove();
                    document.execCommand('insertText', false, content);
                }
            } else if ([ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p'].indexOf(e.target.nodeName) > -1 && $parent[0] !== element) {
                // TODO check if parent is empty, delete if so.
                $parent.after(e.target);
                setCaretAtEndOfElement(e.target);
            }
            fixing = false;
        });
        if (this.config.preventFormattedPaste) preventFormattedPaste(element);
        if (this.config.preventTextOutsideParagraph && $(element).data('type') === 'textarea') preventTextOutsideParagraph(element);
    };
    SpyTextArea.prototype = {
        defaultConfig: {
            preset: 'format',
            preventFormattedPaste: true,
            preventTextOutsideParagraph: true
        },
        presets: {
            full: {
                commands: [
                    'undo', 'redo',
                    'type',
                    'strikethrough', 'underline', 'bold', 'removeFormat',
                    'link',
                    'align',
                    'align-left', 'align-center', 'align-right', 'align-justify',
                    'list-ul', 'list-ol',
                    'reset'
                ],
            },
            format: {
                commands: [
                    'undo', 'redo',
                    'strikethrough', 'underline', 'bold', 'removeFormat',
                    'link',
                    'reset'
                ],
            },
            bare: {
                commands: ['undo', 'redo']
            },
            simpleWithRemove: {
                commands: ['undo', 'redo', 'link', 'html', 'remove', 'save']
            },
            none: {
                commands: []
            }
        },
        hasChanged: function () {
            if (this.originalHTML !== $(this.element).html()) {
                return true;
            } else {
                return false;
            }
        },
        destroy: function () {
            $(this.element).unbind();
            $(this.element).attr('contentEditable', 'false');
            $(this.element).removeClass(_baseClass + 'element');
            delete this.element;
            delete this.addHooks;
            delete this.config;
            delete this.originalHTML;
        }
    };

    var SpyTextToolbar = function (config) {
        var that = this;

        this.config = config || {};
        this.buttons = [];

        var presetConf = this.presets[config.preset ? config.preset : 'global'];

        _.defaults(this.config, presetConf, this.defaultConfig);

        if (this.config.position) this.element = $(_templates.buttonBar({position: this.config.position}));

        if (this.config.parent) {
            $(this.element).prependTo(this.config.parent);
        } else {
            $('body').prepend(this.element);
        }

        if (this.config.buttons) {
            $.each(this.config.buttons, function (i, group) {
                that.addButtonGroup(group);
            });
        }
        
        if (this.config.show) this.show();
        else this.hide();

        $(this.element).on('mousedown', function (ev) {
            ev.preventDefault();
        });
    };
    SpyTextToolbar.prototype = {
        show: function () {
            var that = this;
            $(this.element).show();

            // add margin to body so that top-fixed toolbars won't cover content
            if (this.config.position === 'top-fixed' && $('body').css('margin-top') !== $(this.element).outerHeight() + 'px') {
                $('body').css('margin-top', function (index, curValue) {
                    return parseInt(curValue, 10) + $(that.element).outerHeight() + 'px';
                });
            }
        },
        hide: function () {
            var that = this;
            $(this.element).hide();

            // remove margin from body
            if (this.config.position === 'top-fixed' && $('body').css('margin-top') === $(this.element).outerHeight() + 'px') {
                $('body').css('margin-top', function (index, curValue) {
                    return parseInt(curValue, 10) - $(that.element).outerHeight() + 'px';
                });
            }
        },
        enable: function (commands) {
            $(this.element).removeClass('disabled');
            _.each(this.buttons, function (button) {
                if (commands.indexOf(button.name) > -1) {
                    button.enable();
                }
            });
        },
        disable: function () {
            $(this.element).addClass('disabled');
            _.each(this.buttons, function (button) {
                button.disable();
            });
        },
        addButtonGroup: function (buttonGroup) {
            var that = this;
            var $ul, buttonNames;
            // made it so you can add a name to the buttonGroup, so we can apply an icon and make the group a dropdown if the expanded group does not fit.
            if (buttonGroup instanceof Array) {
                buttonNames = buttonGroup;
                $ul = $(_templates.buttonGroup({ name: 'generic' }));
            } else if (buttonGroup instanceof Object) {
                buttonNames = buttonGroup.buttons;
                $ul = $(_templates.buttonGroup({ name: buttonGroup.name }));
            } else {
                return;
            }
            _.each(buttonNames, function (buttonName) {
                var buttonType = _buttonTypes[buttonName];
                console.log(buttonType.name);

                if (!buttonType) return;

                buttonType.name = buttonName;
                _.defaults(buttonType, _buttonDefaults);

                if (buttonType.dropdown) {
                    var $li = $(_templates.dropdownLi(buttonType));
                    var $nestedUl = $(_templates.dropdownUl());
                    _.each(buttonType.dropdown, function (nestedButtonType) {
                        nestedButtonType.command = buttonType.command;
                        nestedButtonType.name = buttonType.name;

                        _.defaults(nestedButtonType, _buttonDefaults);
                        var dropdownButton = new SpyTextToolbarButton(nestedButtonType, that);
                        $nestedUl.append(dropdownButton.element);
                        that.buttons.push(dropdownButton);
                    });
                    $li.append($nestedUl);
                    $ul.append($li);
                } else {
                    var button = new SpyTextToolbarButton(buttonType, that);
                    that.buttons.push(button);
                    $ul.append(button.element);
                }
            });
            $(this.element).append($ul);
            console.log(this.buttons);
        },
        defaultConfig: {
            preset: 'global',
        },
        presets: {
            global: {
                buttonGroups: [
                    { name: 'undo', buttons: ['undo', 'redo']},
                    { name: 'type', buttons: ['type']},
                    { name: 'format', buttons: ['bold', 'underline', 'strikethrough', 'removeFormat']},//,'color'],
                    ['link'],
                    //['image'],
                    { name: 'align', buttons: ['align-left', 'align-center', 'align-right', 'align-justify']},
                    { name: 'list', buttons: ['list-ul', 'list-ol']},
                    //['indent-right','indent-left'],
                    //['html'],
                    ['reset']
                ],
                show: true,
                position: 'top-fixed'
            },
            group: {
                buttons: [
                    { name: 'undo', buttons: ['undo', 'redo']},
                    { name: 'type', buttons: ['type']},
                    { name: 'format', buttons: ['bold', 'underline', 'strikethrough', 'removeFormat']},//,'color'],
                    ['link'],
                    //['image'],
                    { name: 'align', buttons: ['align-left', 'align-center', 'align-right', 'align-justify']},
                    { name: 'list', buttons: ['list-ul', 'list-ol']},
                    //{ name: 'indent', ['indent-right','indent-left'] },
                    //['html'],
                    ['reset']
                ],
                show: true,
                position: 'prepended'
            },
            full: {
                buttons: [
                    ['undo', 'redo'],
                    ['type'],
                    ['strikethrough', 'underline', 'bold', 'removeFormat'],//,'color'],
                    ['link'],
                    //['image'],
                    ['align'],
                    ['list-ul', 'list-ol'],
                    //['indent-right','indent-left'],
                    //['html'],
                    ['reset']
                ],
                show : false,
                position: 'above-textarea'
            },
            bare: {
                buttons: [['undo', 'redo']],
                show: false,
                position: 'above-textarea'
            },
            simpleWithRemove: {
                buttons: [['undo', 'redo'], ['link'], ['html'], ['remove'], ['save']],
                show: false,
                position: 'above-textarea'
            }
        },
        destroy: function () {
            $(this.element).remove();
            delete this.config;
            this.buttons.length = 0;
            delete this.buttons;
        }
    };

    var SpyTextToolbarButton = function (buttonType, toolbar) {
        var that = this;
        var _disabled = false;

        this.toolbar = toolbar;

        // apply all settings
        _.defaults(this, buttonType, _buttonDefaults);

        var $el = $(_templates.button(this));
        $el.children('.' + _baseClass + 'button').click(_onClick);

        this.element = $el[0];
        // TODO check if one can make better garbage collection
        $el = null;

        this.enable = function () {
            _disabled = false;
            $(this.element).children('.' + _baseClass + 'button').removeClass('disabled');
        };
        this.disable =  function () {
            if (!this.global) {
                _disabled = true;
                $(this.element).children('.' + _baseClass + 'button').addClass('disabled');
            }
        };

        // private methods
        function _onClick(e) { // executed in clicked link context
            e.preventDefault();
            console.log('clicked');
            // check if the selection is in an element owned by the toolbar
            if (_disabled) {
                console.log('is disabled');
                return;
            }
            var textArea;
            if (!that.global) {
                textArea = getCurrentTextArea();
                if (textArea && textArea.toolbar !== that.toolbar) {
                    console.log('wrong toolbar');
                    return;
                }
            }
            //var f;
            if (_commands.hasOwnProperty(that.command)) {
                _commands[that.command](that.attribute, textArea);
            } else {
                _commands.generic(that.command, that.attribute, textArea);
            }
        }
    };

    // ############## HELPER FUNCTIONS ##############
    function getCurrentElement() {
        return $(document.getSelection().anchorNode).closest('[data-name]')[0];
    }

    function getCurrentTextArea() {
        var element = $(document.getSelection().anchorNode).closest('[data-name]')[0];
        return element ? element.textArea : undefined;
    }
    function getSurroundingNode() {
        return window.getSelection().focusNode.parentElement;
    }

    function preventFormattedPaste(element) {
        
        $(element).on('keydown', function (e) {
            if (e.keyCode === 86) {
                var savedRange = window.getSelection().getRangeAt(0);
                var pasteArea = $('<textarea style="position: absolute; top: -1000px; left: -1000px; opacity: 0;" id="paste-area"></textarea>');
                $('body').append(pasteArea);
                pasteArea.focus();
                setTimeout(function () {
                    $(element).focus();
                    var sel = window.getSelection();
                    sel.removeAllRanges();
                    sel.addRange(savedRange);
                    document.execCommand('insertHtml', false, pasteArea.val().replace(/</g, '&lt;').replace(/>/, '&gt;').replace(/\n+/g, '</p><p>'));
                    pasteArea.remove();
                }, 1);
            }
        });
        $(element).on('paste', function (e) {
            e.preventDefault();
            alert('Unformatted paste is not allowed! Use CTRL+V to paste!');
        });
    }

    function preventTextOutsideParagraph(selectorOrObject) {
        var keydownBefore = false;
        $(selectorOrObject).on('keydown', function () {
            keydownBefore = true;
        });
        $(selectorOrObject).on('DOMNodeInserted', function (e) {
            if (e.target === this && keydownBefore) {
                wrapEmptyTextNodes(this);
            }
            keydownBefore = false;
        });
    }

    function turnOffNewLine(element) {
        $(element).keypress(function (e) {
            if (e.keyCode === 10 || e.keyCode === 13) e.preventDefault();
        });
    }

    function cleanup(el) {
        wrapEmptyTextNodes(el);
    }

    function wrapEmptyTextNodes(el) {
        var contents = $(el).contents();
        contents.filter(function () { return this.nodeType === 3; }).wrap('<p></p>');
        contents.filter('br').remove();
        setCaretAtEndOfElement($(el).find('p').last()[0]);
    }

    function getContainedNodes(element) {
        var sel = window.getSelection();
        $(element).children().each(function () {
            if (sel.containsNode(this)) {
                console.log('contained node:');
                console.log(this);
            }
        });

    }

    function selectNodeContents(el) {
        var range = document.createRange();
        range.selectNodeContents(el);
        var sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
    }

    function setCaretAtEndOfElement(element) {
        for (var i = 0; i < element.childNodes.length; i++) {
            console.log(element.childNodes[i]);
        }
        var range = document.createRange();
        if (element.childNodes.length > 0) {
            if (_.last(element.childNodes).nodeName.toLowerCase() === 'br') {
                range.setStartBefore(_.last(element.childNodes));
                range.setEndBefore(_.last(element.childNodes));
            } else {
                range.setStartAfter(_.last(element.childNodes));
                range.setEndAfter(_.last(element.childNodes));
            }
        } else {
            range.setStartAfter(element);
            range.setEndAfter(element);
        }
        var selection = window.getSelection();
        selection.removeAllRanges();
        selection.addRange(range);
    }
    function getBrowser() {
        var matches = window.navigator.userAgent.match(/(chrome|firefox)\/(\d*)/i);
        return { name: matches[1], version: parseInt(matches[2]) };
    }
    function checkBrowser() {
        switch (browser.name.toLowerCase()) {
            case 'chrome':
                return browser.version > 34;
            case 'firefox':
                return browser.version > 28;
            default:
                return false;
        }
    }
        

    window.SpyText = SpyText;
};


// Initialize SpyText so it can be used both with requirejs and as a standalone
if (typeof define !== 'undefined') {
    define(['jquery', 'lodash'], mainFunction);
} else {
    mainFunction($, _);
}
