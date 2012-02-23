(function (window, sandboxed_modules) {
    var modules = {},
        initialized_modules = {},
        require = function (moduleName) {
            var module = modules[moduleName],
                output;

            // Already inited - return as is
            if (initialized_modules[moduleName] && module) {
                return module;
            }

            // Lazy LMD module
            if (typeof module === "string") {
                module = (0, window.eval)(module);
            }

            // Predefine in case of recursive require
            output = {exports: {}};
            initialized_modules[moduleName] = 1;
            modules[moduleName] = output.exports;

            if (!module) {
                // if undefined - try to pick up module from globals (like jQuery)
                module = window[moduleName];
            } else if (typeof module === "function") {
                // Ex-Lazy LMD module or unpacked module ("pack": false)
                module = module(sandboxed_modules[moduleName] ? null : require, output.exports, output) || output.exports;
            }

            return modules[moduleName] = module;
        },
        lmd = function (misc) {
            var output = {exports: {}};
            switch (typeof misc) {
                case "function":
                    misc(require, output.exports, output);
                    break;
                case "object":
                    for (var moduleName in misc) {
                        // reset module init flag in case of overwriting
                        initialized_modules[moduleName] = 0;
                        modules[moduleName] = misc[moduleName];
                    }
                    break;
            }
            return lmd;
        };
    return lmd;
})(window,{"MessageView":true,"DataGenerator":true,"Logger":true,"Hook":true})({
"main": /**
 *
 * @see articles:
 *
 * Andrew Dupont (Gowalla, Prototype.js, S2)
 * 1. Maintainable JavaScript
 *    http://channel9.msdn.com/Events/MIX/MIX11/EXT23
 *
 * Nicholas Zakas (Yahoo!, YUI, YUI Test)
 * 2. Writing Maintainable JavaScript
 *    http://www.yuiblog.com/blog/2007/05/25/video-zakas/
 * Slides:
 *    New: http://www.slideshare.net/nzakas/maintainable-javascript-2011
 *    Old: http://www.slideshare.net/nzakas/maintainable-javascript-1071179
 *
 * 3. Scalable JavaScript Application Architecture
 *    http://developer.yahoo.com/yui/theater/video.php?v=zakas-architecture
 */

function main(require, exports, module) {
    "use strict";
    require('Core').init();
},
"Core": function Core(require, exports) {
    "use strict";

    var $ = require('$'),
        templateFactory = require('Template'),
        Sandbox = require('Sandbox'),
        EventManager = require('EventManager');

    /**
     * @namespace
     */
    var Core = {
        /**
         * Application descriptor
         *
         * @type Object
         */
        descriptor: {},

        /**
         * Modules descriptors
         *
         * @type Object
         */
        descriptors: {},

        /**
         * Modules locales
         *
         * @type Object
         */
        locales: {},

        /**
         * Modules templates
         *
         * @type Object
         */
        templates: {},

        /**
         * @type Object
         */
        runningModules: {},

        /**
         * Starts app
         *
         * @returns Core
         */
        init: function () {
            this.descriptor = require('descriptor');
            this.descriptors = require('descriptors');
            this.templates = require('templates');
            this.locales = require('locales');

            this._initModules();
        },

        /**
         * @private
         */
        _initModules: function () {
            // Load all
            for (var i = 0, c = this.descriptor.modules.length; i < c; i++) {
                this.initModule(this.descriptor.modules[i]);
            }
        },

        /**
         * Public version of _initModules
         *
         * @param {String}   name
         *
         * @returns Core
         */
        initModule: function (name) {
            if (this.runningModules[name]) {
                return this;
            }
            var sandbox = new Sandbox(this.descriptors[name]);
            this.runningModules[name] = require(name);
            this.runningModules[name].init(sandbox);

            return this;
        },

        /**
         * Destroys module
         *
         * @param {String} name
         *
         * @returns Core
         */
        destroyModule: function (name) {
            if (this.runningModules[name]) {
                this.runningModules[name].destroy();
                
                // Cleanup
                EventManager.unbind('.' + name);
                this.getBox().html('');
                delete this.runningModules[name];
            }
            return this;
        },

        /**
         * Get modules box if exists
         *
         * @param {String} name
         *
         * @returns {HTMLElement|undefined}
         */
        getBox: function (name) {
            return ($(this.descriptor.layout[name]));
        },

        /**
         * Gets module template
         *
         * @param {String} moduleName
         * @param {String} templateSelector
         *
         * @returns {Function|undefined}
         */
        getTemplate: function (moduleName, templateSelector) {
            if (typeof this.templates[moduleName] === "string") {
                // wrap all templates
                this.templates[moduleName] = $('<div/>').html(this.templates[moduleName]);
            }
            return templateFactory(this.templates[moduleName].find(templateSelector).html());
        },

        /**
         * gets locale string
         *
         * @param {String} moduleName
         * @param {String} message
         *
         * @returns {String}
         */
        getText: function (moduleName, message) {
            var locale = this.locales[moduleName][message];
            return (typeof locale === "object" ? locale[this.descriptor.locale] : locale) || message;
        }
    };

// ---------------------------------------------------------------------------------------------------------------------

    /**
     * Global Core object
     */
    var coreExports = {
        trigger:       $.proxy(EventManager.trigger, EventManager),
        bind:          $.proxy(EventManager.bind, EventManager),
        unbind:        $.proxy(EventManager.unbind, EventManager),
        on:            $.proxy(EventManager.bind, EventManager),

        init:          $.proxy(Core.init, Core),
        destroyModule: $.proxy(Core.destroyModule, Core),
        initModule:    $.proxy(Core.initModule, Core),
        getTemplate:   $.proxy(Core.getTemplate, Core),
        getText:       $.proxy(Core.getText, Core),
        getBox:        $.proxy(Core.getBox, Core)
    };

    // exports
    for (var i in coreExports) {
        exports[i] = coreExports[i];
    }
}
,
"Template": function Template() {
    /**
     * Simple JavaScript Templating
     * John Resig - http://ejohn.org/ - MIT Licensed
     *
     * @param {String} str  template string
     * @param {Object} [data] template data
     *
     * @returns {Function|String} template or string
     */
    return function (str, data) {
        var fn =  new Function("obj",
        "var p=[],print=function(){p.push.apply(p,arguments);};" +

        // Introduce the data as local variables using with(){}
        "with(obj || {}){p.push('" +

        // Convert the template into pure JavaScript
        String(str)
        .replace(/[\r\t\n]/g, " ")
        .split("{%").join("\t")
        .replace(/((^|%})[^\t]*)'/g, "$1\r")
        .replace(/\t=(.*?)%}/g, "',$1,'")
        .split("\t").join("');")
        .split("%}").join("p.push('")
        .split("\r").join("\\'")
        + "');}return p.join('');");

        // Provide some basic currying to the user
        return data ? fn( data ) : fn;
    };
},
"EventManager": function EventManager(require) {
    var $ = require('$');

    /**
    * @namespace
    */
    return {
        /**
        * @type jQuery
        */
        $: $('<div/>'),
        /**
        * hooks list
        * @tyoe Object
        */
        hooks: {},
        /**
        * Hooked version of jQuery#trigger
        *
        * @param {String} event
        * @param {Array}  data
        *
        * @returns {EventManager}
        */
        trigger: function (event, data) {
            if (this.hooks[event]) {
                // Update event data
                var result = this.hooks[event](data);
                // Don't trigger event
                if (result === false) {
                    return this;
                }
                // Trigger with new data
                data = result || data;
            }
            this.$.trigger.apply(this.$, [event, data]);
            return this;
        },
        /**
        * Remap of jQuery#bind
        *
        * @see jQuery#bind
        *
        * @returns {EventManager}
        */
        bind: function () {
            this.$.bind.apply(this.$, arguments);
            return this;
        },
        /**
        * Remap of jQuery#bind
        *
        * @see jQuery#unbind
        *
        * @returns {EventManager}
        */
        unbind: function () {
            this.$.unbind.apply(this.$, arguments);
            return this;
        },
        /**
        * Adds hook to specific event
        *
        * @param {String}   event
        *
        * @returns {EventManager}
        */
        hook: function (event, hookFunction) {
            // One hook for example
            this.hooks[event] = hookFunction;
            return this;
        },
        /**
        * Removes hook from specific event
        *
        * @param {String}   event
        *
        * @returns {EventManager}
        */
        unhook: function (event) {
            delete this.hooks[event];
            return this;
        }
    };
},
"Sandbox": function Sandbox(require) {
    var Core = require('Core'),
        EventManager = require('EventManager');

    /**
     * @constructor
     * @param {Object} descriptor
     */
    var Sandbox = function (descriptor) {
        this.descriptor = descriptor || {};
    };

    /**
     * Gets module box
     *
     * @returns {HTMLElement|undefined}
     */
    Sandbox.prototype.getBox = function () {
        return Core.getBox(this.descriptor.name);
    };

    /**
     * Checks if module allowed to...
     *
     * @param {String} role...
     *
     * @returns {Boolean}
     */
    Sandbox.prototype.is = function (eventType, event) {
        var acl = this.descriptor.acl;
        var typedAcl = (acl[eventType] || []);

        if (acl['*'] || eventWithWildcardMatchesAcl(event, typedAcl)) {
            return true;
        }
        
        if (typedAcl.indexOf(event) != -1) {
            return true;
        }

        function eventWithWildcardMatchesAcl(event, acl) {
            var eventMatches = acl.filter(function (aclEvent) {
	            if (aclEvent.indexOf("*") == -1) {
	            	return false;
	            }
	            
                return event.match(new RegExp(aclEvent));
            });

            return !!eventMatches.length;
        }
    };

    /**
     * Binds to specific event
     *
     * @param {String}   event
     * @param {Function} callback
     *
     * @returns {Sandbox}
     */
    Sandbox.prototype.bind = function (event, callback) {
        if (this.is('listen', event)) {
            // Adds module name as namespace
            EventManager.bind(event + '.' + this.descriptor.name, callback);
        }

        return this;
    };

    /**
     * Unbinds specific event
     *
     * @param {String}   event
     * @param {Function} callback
     *
     * @returns {Sandbox}
     */
    Sandbox.prototype.unbind = function (event, callback) {
        if (this.is('listen', event)) {
            // Adds module name as namespace
            EventManager.unbind(event + '.' + this.descriptor.name, callback);
        }

        return this;
    };

    /**
     * Triggers specific event
     *
     * @param {String} event
     * @param {Mixed}  data
     *
     * @returns {Sandbox}
     */
    Sandbox.prototype.trigger = function (event, data) {
        if (this.is('trigger', event)) {
            EventManager.trigger(event, data);
        }

        return this;
    };

    /**
     * Hooks specific event
     *
     * @param {String}   event
     * @param {Function} hookFunction
     *
     * @returns {Sandbox}
     */
    Sandbox.prototype.hook = function (event, hookFunction) {
        if (this.is('hook', event)) {
            EventManager.hook(event, hookFunction);
        }

        return this;
    };

    /**
     * Removes hook from specific event
     *
     * @param {String}   event
     *
     * @returns {Sandbox}
     */
    Sandbox.prototype.unhook = function (event) {
        if (this.is('hook', event)) {
            EventManager.unhook(event);
        }

        return this;
    };

    /**
     * gets locale string
     *
     * @param {String} message
     *
     * @returns {String}
     */
    Sandbox.prototype.getText = function (message) {
        return Core.getText(this.descriptor.name, message);
    };

    /**
     * gets module resource
     *
     * @param {String} resource
     *
     * @returns {Mixed}
     */
    Sandbox.prototype.getResource = function (resource) {
        return this.descriptor.resources[resource];
    };

    /**
     * gets module template
     *
     * @param {String} templateSelector
     *
     * @returns {Function|undefined}
     */
    Sandbox.prototype.getTemplate = function (templateSelector) {
        return Core.getTemplate(this.descriptor.name, templateSelector);
    };

    Sandbox.prototype.getAcl = function(eventType) {
        return this.descriptor.acl[eventType];
    };

    // exports
    return Sandbox;
},
"locales": {"MessageView":{"text_label":{"ru":"Он сказал: ","en":"He said: "}},"DataGenerator":{},"Logger":{},"Hook":{}},
"templates": {"MessageView":"<div class=\"b-message-view\">\r\n    <span class=\"b-message-view__label\">{%=label%}</span><span class=\"b-message-view__value\">{%=value%}</span>\r\n</div>"},
"descriptors": {"MessageView":{"name":"MessageView","acl":{"trigger:newData:display":true,"listen:newData":true},"resources":{}},"DataGenerator":{"name":"DataGenerator","acl":{"trigger:newData":true},"resources":{"interval":1000}},"Logger":{"name":"Logger","acl":{"listen:newData":true,"listen:ready":true},"resources":{}},"Hook":{"name":"Hook","acl":{"hook:newData":true},"resources":{}}},
"descriptor": {
    "modules": ["MessageView", "DataGenerator", "Logger", "Hook"],
    "layout": {
        "MessageView": ".b-message-view"
    },
    "locale": "ru",
    "path": {
        "descriptor": "./app/descriptors/",
        "module": "./app/modules/",
        "locale": "./app/locales/",
        "template": "./app/templates/"
    }
},
"MessageView": function MessageView(sandboxed, exports, module) {
    "use strict";
    var messageViewInstance;

    var MessageView = function (sandbox) {
        var self = this;
        this.sandbox = sandbox;
        this.template = sandbox.getTemplate(".b-message-view");
        this.label = sandbox.getText("text_label");
        this.$box = sandbox.getBox();

        sandbox.bind('newData', function (_, text) {
            self.update(text);
        });
    };

    MessageView.prototype.update = function (text) {
        var html = this.template({
            label: this.label,
            value: text
        });
        this.$box.html(html);
        this.sandbox.trigger('newData:display');
    };

    return {
        init: function (sandbox) {
            messageViewInstance = new MessageView(sandbox);
        },
        destroy: function () {
            messageViewInstance = null;
        }
    };
},
"DataGenerator": function DataGenerator(sandboxed, exports, module) {
    "use strict";
    var intervalId;
        
    return {
        init: function (sandbox) {
            intervalId = setInterval(function () {
                sandbox.trigger('newData', Math.random());
            }, sandbox.getResource('interval'));
        },
        destroy: function () {
            clearInterval(intervalId);    
        }
    };
},
"Logger": function Logger(sandboxed, exports, module) {
    "use strict";
    var printLog = function (event, data) {
        console.log(event.type, data);
    };
        
    return {
        init: function (sandbox) {
            sandbox.bind('newData', printLog);
            sandbox.bind('ready', printLog);
        },
        destroy: function () {}
    };
},
"Hook": function Hook(sandboxed, exports, module) {
    "use strict";
    var sb;

    return {
        init: function (sandbox) {
            sb = sandbox;
            sandbox.hook('newData', function (data) {
                if (typeof data === "string") {
                    return false;
                }
                if (data < 0.5) {
                    data = data * 100;
                }
                return data;
            });
        },
        destroy: function () {
            sb.unhook('newData');    
        }
    };
}
})(undefined)