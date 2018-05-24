var $ = require('./vendor/jquery');
var _ = require('./vendor/underscore');
require('./vendor/bootstrap');
var MarkdownIt = require('./vendor/markdown-it');
window.cytoscape = require('./vendor/cytoscape');
require('./vendor/cytoscape-panzoom');
var Split = require('./vendor/split');
var FileSaver = require('./vendor/FileSaver');
require('./vendor/jquery-ui');
require('./vendor/yaml');

var YAML = window.YAML;
console.log(YAML);

var Handlebars = require('./vendor/handlebars.runtime');

window.HandlebarsTemplates = {
    'workflows/sidebar_content': require("../templates/sidebar_content.hbs"),

    'workflows/fields/MultipleChoice': require("../templates/multiple_choice.hbs"),
    'workflows/fields/Text': require("../templates/text.hbs"),

    // also partials
    'workflows/fields/MultipleChoiceAnswer': require("../templates/multiple_choice_answer.hbs"),
    'workflows/fields/TextInput': require("../templates/text_input.hbs"),


    // concept maps
    'workflows/EdamInput': require("../templates/edam_input.hbs"),
    'workflows/edam': require("../templates/edam.hbs"),
};



window.Workflows = {
    formSubmitted: false,

    handleClick: function (e) {
        if (Workflows.state === 'adding node') {
            Workflows.placeNode(e.position);
        } else if (Workflows.state === 'linking node') {
            if (e.target && e.target !== cy && e.target.isNode()) {
                Workflows.createLink(e);
            }
        }
    },

    setState: function (state, message) {
        Workflows.state = state;
        if (message)
            $('#workflow-status-message').html(message).show();
        var button = $('#workflow-toolbar-cancel');
        button.find('span').html('Cancel ' + state);
        button.show();
    },

    cancelState: function () {
        Workflows.state = '';

        if (Workflows.selected) {
            Workflows.selected.unselect();
            Workflows.selected = null;
        }

        $('#workflow-status-message').html('').hide();
        // $('#workflow-status-selected-node').html('<span class="muted">Nothing selected</span>').attr('title', '');
        $('#workflow-status-bar').find('.node-context-button').hide();
        $('#workflow-toolbar-cancel').hide();

        Workflows.sidebar2.clear();
    },

    select: function (target) {
        if (target.isNode()) {
            Workflows.selected = target;
            Workflows.setState('node selection');
            $('#workflow-status-bar').find('.node-context-button').show();
            $('#workflow-status-selected-node').html(Workflows.selected.data('name'))
                .attr('title', Workflows.selected.data('name'));
        } else if (target.isEdge()) {
            Workflows.selected = target;
            Workflows.setState('edge selection');
            $('#workflow-status-bar').find('.edge-context-button').show();
            $('#workflow-status-selected-node').html(Workflows.selected.data('name') + ' (edge)')
                .attr('title',Workflows.selected.data('name') + ' (edge)');
        }
    },

    select2: function (target) {
        if (target.isNode()) {
            Workflows.selected = target;
            $('#workflow-status-bar').find('.node-context-button').show();
        } else if (target.isEdge()) {
            Workflows.selected = target;
        }
    },

    setAddNodeState: function () {
        Workflows.cancelState();
        Workflows.setState('adding node', 'Click on the diagram to add a new node.');
    },

    placeNode: function (position, parentId) {
        // Offset child nodes a bit so they don't stack on top of each other...
        var pos = { x: position.x, y: position.y };
        if (parentId && Workflows.selected.children().length > 0)
            pos.y = Workflows.selected.children().last().position().y + 40;

        Workflows.controller.populate(pos);
        // Workflows.controller.counter += 1;
        // Workflows.sidebar2.populate(parentId ? 'Add child node' : 'Add node', { parent: parentId }, pos);

        // $('#node-modal').modal('show');
    },

    addNode: function () {
        var node = Workflows.nodeModal.fetch();
        $('#node-modal').modal('hide');

        Workflows.history.modify(node.data.parent ? 'add child node' : 'add node', function () {
            var newNode = cy.add(node);
            // Select the new node, or if it is a child node, select the parent.
            if (!node.data.parent) {
                newNode.select();
            } else {
                cy.$('#' + node.data.parent).select();
            }
        });
    },

    addChild: function () {
        Workflows.placeNode(Workflows.selected.position(), Workflows.selected.id());
    },

    edit: function () {
        if (Workflows.state === 'node selection') {
            Workflows.nodeModal.populate('Edit node', Workflows.selected.data(), Workflows.selected.position());
        } else if (Workflows.state === 'edge selection') {
            $('#edge-modal').modal('show');
            $('#edge-modal-form-label').val(Workflows.selected.data('name'));
        }
    },

    updateNode: function () {
        var node = Workflows.selected;

        Workflows.history.modify('edit node', function () {
            node.data(Workflows.nodeModal.fetch().data);
        });

        $('#node-modal').modal('hide');
        node.select();
    },

    updateEdge: function () {
        var edge = Workflows.selected;

        Workflows.history.modify('edit edge', function () {
            edge.data('name', $('#edge-modal-form-label').val());
        });

        $('#edge-modal').modal('hide');
        edge.select();
    },

    nodeModalConfirm: function () {
        $('#node-modal-form-id').val() ? Workflows.updateNode() : Workflows.addNode();
    },

    edgeModalConfirm: function () {
        Workflows.updateEdge();
    },

    setLinkNodeState: function () {
        Workflows.setState('linking node', 'Click on a node to create a link.');
    },

    createLink: function (e) {
        // Workflows.history.modify('link', function () {
            e.cy.add({
                group: "edges",
                data: {
                    source: Workflows.selected.data('id'),
                    target: e.target.data('id')
                }
            });
        // });

        Workflows.cancelState();
    },

    delete: function () {
        if (confirm('Are you sure you wish to delete this?')) {
            Workflows.history.modify('delete', function () {
                Workflows.selected.remove();
            });

            Workflows.cancelState();
        }
    },

    promptBeforeLeaving: function (e) {
        /*
        if ($("#workflow-diagram-content #cy[data-editable='true']").length > 0) {
            if (Workflows.history.index > 0 && !Workflows.formSubmitted) {
                return confirm('You have unsaved changes, are you sure you wish to leave the page?');
            } else {
                e = null;
            }
        }*/
    },

    storeLastSelection: function () {
        if (typeof Storage !== 'undefined') {
            var id = $('#workflow-content-json').data('tessId');
            var lastSelectedID = cy.$(':selected').id();
            if (lastSelectedID) {
                localStorage.setItem('workflow-last-selection-' + id, lastSelectedID);
            }
        }
    },

    loadLastSelection: function () {
        if (typeof Storage !== 'undefined') {
            var id = $('#workflow-content-json').data('tessId');
            var lastSelectedID = localStorage.getItem('workflow-last-selection-' + id);
            if (lastSelectedID) {
                cy.$('#' + lastSelectedID).select();
            }
        }
    },

    nodeModal: {
        populate: function (title, data, position) {
            $('#node-modal-title').html('title');
            $('#node-modal').modal('show');
            $('#node-modal-form-id').val(data.id);
            $('#node-modal-form-title').val(data.name);
            $('#node-modal-form-description').val(data.description);
            if (data.color) {
                $('#node-modal-form-colour')[0].jscolor.fromString(data.color);
            } else if (data.parent) {
                $('#node-modal-form-colour')[0].jscolor.fromString(cy.$('#' + data.parent).data('color'));
            }
            $('#node-modal-form-parent-id').val(data.parent);
            $('#node-modal-form-x').val(position.x);
            $('#node-modal-form-y').val(position.y);
            $('#term-autocomplete').val('');
            Workflows.associatedResources.populate(data.associatedResources || []);
            Workflows.ontologyTerms.populate(data.ontologyTerms || []);
        },

        fetch: function () {
            return {
                data: {
                    name: $('#node-modal-form-title').val(),
                    description: $('#node-modal-form-description').val(),
                    html_description: MarkdownIt.render($('#node-modal-form-description').val()),
                    color: $('#node-modal-form-colour').val(),
                    font_color: $('#node-modal-form-colour').css("color"),
                    parent: $('#node-modal-form-parent-id').val(),
                    associatedResources: Workflows.associatedResources.fetch(),
                    ontologyTerms: Workflows.ontologyTerms.fetch()
                },
                position: {
                    x: parseInt($('#node-modal-form-x').val()),
                    y: parseInt($('#node-modal-form-y').val())
                }
            };
        }
    },

    sidebar2: {
        init: function () {
            var sidebar = $('#workflow-diagram-sidebar');
        },
        highlight: function (id, color) {
            $('#workflow-diagram-sidebar-desc').find("#" + id).addClass("highlighted");
            $('#workflow-diagram-sidebar-desc').find("#" + id).css("border-color", color);
        },
        unhighlight: function() {
            $('#workflow-diagram-sidebar-desc').find(".highlighted").removeClass("highlighted");
        },
        clear: function () {
            $('#workflow-diagram-sidebar-title').html('<span class="muted">Nothing is selected</span>')
                .css('background-color', "")
                .css('color', "");
            $('#workflow-diagram-sidebar-desc').html("");

            $("#workflow-diagram-sidebar-repeat").hide();
            $("#workflow-diagram-sidebar-next").hide();
        },

        setButtonState: function(target) {
            if (target.isNode()) {
                try {
                    $("#workflow-diagram-sidebar-next").text("Add a " + Object.keys(Workflows.controller.nextNodeType())[0]);
                    $("#workflow-diagram-sidebar-repeat").text("Repeat a " + Object.keys(Workflows.controller.currentNodeType())[0]);
                } catch (err) {
                    // TODO: something with params consistency and so on
                }
            }
        },

        populate: function(e){
            if (e.target.isNode()) {
                var target;
                if (e.target.data('type') === "node") {
                    target = e.target;
                } else if (e.target.data('type') === "field") {
                    target = e.target.ancestors()[0];
                }

                $('#workflow-diagram-sidebar-title').html(target.data('name') || '<span class="muted">Untitled</span>')
                    .css('background-color', target.data('color'))
                    .css('color', target.data('font_color'));

                var $desk = $('#workflow-diagram-sidebar-desc').html("");

                // node = Workflows.controller.nextNodeType() || Workflows.controller.currentNodeType();

                $("#workflow-diagram-sidebar-next").show();

                // $("#workflow-diagram-sidebar-next").text("Add a " + Object.keys(Workflows.controller.nextNodeType()));

                if (target.data('multiple')) {
                    $("#workflow-diagram-sidebar-repeat").show();
                } else {
                    $("#workflow-diagram-sidebar-repeat").hide();
                }

                var children = target.descendants();

                for (var i = 0; i < children.length; i++) {
                    (function(child) {
                        // params
                        var field = {
                            datatype: child.data('datatype'),
                            name: child.data('name'),
                            required: child.data('required'),
                            multiple: child.data('multiple'),
                            data: child.data('data'),
                            info: child.data('info'),
                            id: child.data('id')
                        };

                        // console.log(field);
                        // console.log(field);

                        // var $fieldNode = $(HandlebarsTemplates['workflows/fields/' + field.datatype](field));

                        var $fieldNode;

                        switch (field.datatype) {
                            case "Text":
                                $fieldNode = Workflows.DataTypeView.Text.render(field);
                                break;
                            case "MultipleChoice":
                                $fieldNode = Workflows.DataTypeView.MultipleChoice.render(field);
                                break;
                            case "OperationOntologyTerm":
                                $fieldNode = Workflows.DataTypeView.OperationOntologyTerm.render(field);
                                break;

                            case "InputTypeOntologyTerm":
                                $fieldNode = Workflows.DataTypeView.InputTypeOntologyTerm.render(field);
                                break;

                            case "OutputTypeOntologyTerm":
                                $fieldNode = Workflows.DataTypeView.OutputTypeOntologyTerm.render(field);
                                break;

                            case "FormatTypeOntologyTerm":
                                $fieldNode = Workflows.DataTypeView.OutputTypeOntologyTerm.render(field);
                                break;
                        }


                        $desk.append($fieldNode);
                        /*
                        $fieldNode.find(".check").each(function(i, el) {
                            console.log(i);
                            if (field.correct.indexOf(i) !== -1) {
                                $(el).attr("checked", "checked");
                            }
                        });

                        $fieldNode.find(".form-repeat").click(function () {
                            var $input = $('<input type="text" class="form-control field">');


                            if (field.type === "multichoice") {
                                // $input.prepend("<label class=\"muted\"><input type='checkbox' /> mark as correct</label>")
                                var $input = $('<div class="field"><label class="muted"><input class="check" type="checkbox" /> mark as correct</label><input type="text" class="form-control"></div>');
                            }

                            $input.insertAfter($(this).parent().find('input').last());



                            (function(i){

                                if (field.type === "multichoice") {
                                    $input.find('input[type="text"]').keyup(function () {
                                        field.forms[i] = $(this).val();
                                        console.log(field.forms);
                                    });
                                } else {
                                    $input.keyup(function () {
                                        field.forms[i] = $(this).val();
                                        console.log(field.forms);
                                    });
                                }

                                $input.find(".check").click(function() {
                                   if (this.checked) {
                                       field.correct.push(i-1);
                                   }
                                   else {
                                       var idx = field.correct.indexOf(i - 1);
                                       if (idx !== -1) {
                                           field.correct.splice(idx, 1);
                                       }
                                   }
                                    console.log(field.correct);
                                });
                            })(field.forms.length);

                            field.forms.push("");

                            $input.focus();


                            // Update buttons
                            if (field.forms.length <= 1) {
                                $fieldNode.find(".form-remove").hide();
                            } else {
                                $fieldNode.find(".form-remove").show(500);
                            }
                        });

                        $fieldNode.find(".form-info").click(function() {

                            $(this).next().toggle(100);
                            // $(this).next().show();
                        });

                        $fieldNode.find(".form-remove").click(function () {
                            $(this).parent().find('.field').last().remove();
                            field.forms.pop();

                            var i = field.forms.length - 1;
                            var idx = field.correct.indexOf(i);
                            if (idx !== -1) {
                                field.correct.splice(idx, 1);
                            }


                            // Update buttons
                            if (field.forms.length <= 1) {
                                $fieldNode.find(".form-remove").hide();
                            } else {
                                $fieldNode.find(".form-remove").show();
                            }
                        });

                        $fieldNode.find('input[type="text"]').each(function (i, el) {
                            $(el).keyup(function () {
                                field.forms[i] = $(el).val();
                                console.log( field.forms );
                            });

                        });

                        $fieldNode.find(".check").each(function(i, el) {

                            $(el).click(function() {
                                if (this.checked) {
                                    field.correct.push(i);
                                }
                                else {
                                    var idx = field.correct.indexOf(i);
                                    if (idx !== -1) {
                                        field.correct.splice(idx, 1);
                                    }
                                }
                                console.log(field.correct);
                            });

                        });

                        if (field.forms.length <= 1) {
                            $fieldNode.find(".form-remove").hide();
                        } else {
                            $fieldNode.find(".form-remove").show();
                        }

                        $desk.append($fieldNode);

                        */

                        // if (field.type === "edam_operation") {
                        //     $fieldNode.find('input').autocomplete({
                        //         serviceUrl: 'http://193.40.11.103/edam/operations', // https://tess.elixir-europe.org/edam/operations
                        //         dataType: 'json',
                        //         deferRequestBy: 150,
                        //         paramName: 'filter',
                        //         transformResult: function (response) {
                        //             // console.log(response);
                        //             return {
                        //                 suggestions: $.map(response, function (item) {
                        //                     return {value: item['Preferred Label'], data: item};
                        //                 })
                        //             };
                        //         },
                        //         onSelect: function (suggestion) {
                        //             $(this).val('');
                        //             $fieldNode.find('input').val(suggestion.value);
                        //             Workflows.ontologyTerms.add(suggestion);
                        //         },
                        //         onSearchStart: function () {
                        //             $(this).addClass('loading');
                        //         },
                        //         onSearchComplete: function () {
                        //             $(this).removeClass('loading');
                        //         }
                        //     });
                        // }

                        // if (field.type === "edam_input" || field.type === "edam_output") {
                        //     $fieldNode.find('input').autocomplete({
                        //         serviceUrl: 'http://193.40.11.103/edam/data', // https://tess.elixir-europe.org/edam/operations
                        //         dataType: 'json',
                        //         deferRequestBy: 150,
                        //         paramName: 'filter',
                        //         transformResult: function (response) {
                        //             // console.log(response);
                        //             return {
                        //                 suggestions: $.map(response, function (item) {
                        //                     return {value: item['Preferred Label'], data: item};
                        //                 })
                        //             };
                        //         },
                        //         onSelect: function (suggestion) {
                        //             $(this).val('');
                        //             $fieldNode.find('input').val(suggestion.value);
                        //             Workflows.ontologyTerms.add(suggestion);
                        //         },
                        //         onSearchStart: function () {
                        //             $(this).addClass('loading');
                        //         },
                        //         onSearchComplete: function () {
                        //             $(this).removeClass('loading');
                        //         }
                        //     });
                        // }

                        // if (field.type === "edam_format") {
                        //     $fieldNode.find('input').autocomplete({
                        //         serviceUrl: 'http://193.40.11.103/edam/formats', // https://tess.elixir-europe.org/edam/operations
                        //         dataType: 'json',
                        //         deferRequestBy: 150,
                        //         paramName: 'filter',
                        //         transformResult: function (response) {
                        //             // console.log(response);
                        //             return {
                        //                 suggestions: $.map(response, function (item) {
                        //                     return {value: item['Preferred Label'], data: item};
                        //                 })
                        //             };
                        //         },
                        //         onSelect: function (suggestion) {
                        //             $(this).val('');
                        //             $fieldNode.find('input').val(suggestion.value);
                        //             Workflows.ontologyTerms.add(suggestion);
                        //         },
                        //         onSearchStart: function () {
                        //             $(this).addClass('loading');
                        //         },
                        //         onSearchComplete: function () {
                        //             $(this).removeClass('loading');
                        //         }
                        //     });
                        // }

                    })(children[i]);
                }

                if (e.target.data('type') === "field") {
                    // highlight field
                    Workflows.sidebar2.unhighlight();
                    Workflows.sidebar2.highlight(e.target.data('id'), e.target.data('color'));

                }

                // set buttons' events
                $("#workflow-diagram-sidebar-next").unbind("click.next");
                $("#workflow-diagram-sidebar-repeat").unbind("click.repeat");

                $("#workflow-diagram-sidebar-next").bind("click.next", function() {
                    $("#workflow-diagram-sidebar-next").trigger("next-please");
                });

                $("#workflow-diagram-sidebar-repeat").bind("click.repeat", function() {
                    $("#workflow-diagram-sidebar-repeat").trigger("repeat-please");
                });

            }
            else {
                // console.log(123);
            }
        }


    },

    controller: {
        counter: 0, // FIXME
        config: null,
        params: {}, // configuration of the current node type

        getNodeName: function(node) {

        },

        init: function(node) {
                var nodeTypeName = Object.keys(node)[0];
                var nodeType = node[nodeTypeName];

                var name = nodeType['NodeTypeName'];
                var colour = nodeType['Colour'] || "#bbbbbb"; // default
                var fontColour = nodeType['FontColour'] || "#00082b"; // default
                var promptPosition = nodeType['PromptPosition'];
                var required = nodeType['Required'];
                var multiple = nodeType['Multiple'];

                var fields = _.map(nodeType['Fields'], function(data, i) {
                    return {
                        datatype: data['DataType'],
                        name: data['FieldName'],
                        required: data['Required'],
                        multiple: data['Multiple'],
                        markdown: data['MarkdownFormatting'],
                        info: data['InfoText']
                    }
                });

                // render form
                Workflows.controller.params = {
                    name:  name,
                    color: colour,
                    font_color: fontColour,
                    fields: fields,
                    promptPosition: 0,
                    required: required,
                    multiple: multiple,
                    nodetype: nodeTypeName
                };
                // Workflows.controller.populate();
        },


        populate: function(position) { // TODO: find the word reflecting the purpose of this fn

            console.log(position);

            var params = Workflows.controller.params;

            cy.add({
                data: {
                    type: "node",
                    id: "node-" + Workflows.controller.counter,
                    name: params.name,
                    color: params.color,
                    font_color: params.font_color,
                    nodetype: params.nodetype,
                    multiple: params.multiple,
                    width: 500
                }
            });

            if (position) {
                console.log("trying to render node");
            } else {
                // if there is no position we are in sequential mode
                // 1. check if there are successors

                if (Workflows.selected) {
                    if (Workflows.selected.descendants().length > 0) {
                        var selected = Workflows.selected;
                    } else {
                        var selected = Workflows.selected.parent();
                    }


                    if (selected.outgoers().length > 0) {
                        var edge = selected.outgoers()[0];
                        var outgoer = selected.outgoers()[1];
                        var successors = selected.successors();

                        edge.remove();

                        cy.add({
                            group: "edges",
                            data: {
                                source: selected.data('id'),
                                target: "node-" + Workflows.controller.counter
                            }
                        });

                        cy.add({
                            group: "edges",
                            data: {
                                source: "node-" + Workflows.controller.counter,
                                target: outgoer.data('id')
                            }
                        });

                        successors.shift('x', 200);

                    } else {
                        cy.add({
                            group: "edges",
                            data: {
                                source: selected.data('id'),
                                target: "node-" + Workflows.controller.counter
                            }
                        });
                    }

                }
            }


            switch (params.nodetype) {
                case "LearningObejectivesAndOutcomes":
                case "Task":
                case "Quiz":
                case "FurtherReading":
                    var origX = 0;
                    if (Workflows.selected) {
                        if (Workflows.selected.descendants().length > 0) {
                            origX = parseInt(Workflows.selected.descendants()[0].position().x) + 200;
                        } else {
                            origX = parseInt(Workflows.selected.position().x) + 200;
                        }
                    }

                    var calcPosition = Workflows.Layout.vertical({
                        origX: origX,
                        origY: 0,
                        shiftY: 50
                    });
                    break;
                case "Operation":
                    var calcPosition = Workflows.Layout.operation({
                        origX: position.x,
                        origY: position.y,
                        shiftY: 50,
                        inputWidth: 200
                    });
                    break;
                default:
                    throw new Error("unknown node type " + params.nodetype);
                    break;
            }



            _.each(params.fields, function (field, i) {

                var calc = calcPosition(field.datatype);
                var pos = (calc && calc.position) || {x: 0, y: 0};
                var width = (calc && calc.width) || 200;

                cy.add({
                    data: {
                        parent: "node-" + Workflows.controller.counter,
                        id: "node-" + Workflows.controller.counter + "-" + i,
                        name: field.name,
                        color: params.color,
                        type: "field",
                        font_color: params.font_color,
                        datatype: field.datatype, // Text -> MultiText?
                        required: field.required,
                        info: field.info,
                        multiple: field.multiple,
                        data: Workflows.DataType[field.datatype].init(),
                        width: width
                    },
                    position: pos,

                });

                if (i > 0) { // add property like "connected"
                    cy.add({
                        group: "edges",
                        data: {
                            source: "node-" + Workflows.controller.counter + "-" + (i-1),
                            target: "node-" + Workflows.controller.counter + "-" + i
                        }
                    });
                }
            });

            // Workflows.history


            Workflows.cancelState();
            cy.$(':selected').unselect();
            cy.$('#' + "node-" + Workflows.controller.counter).select();

            Workflows.history.modify("test"); // TODO: message


            Workflows.controller.counter += 1;
        },

        nextNodeType: function () {
            var config = Workflows.controller.config;
            if (Workflows.selected) {

                if (Workflows.selected.descendants().length > 0) {
                    var selected = Workflows.selected;
                } else {
                    var selected = Workflows.selected.parent();
                }

                var currentNodeTypeName = selected.data('nodetype');

                for (var i = 0; i < config['NodeTypes'].length; i++) {
                    var nodeTypeName = Object.keys(config['NodeTypes'][i])[0];
                    if (nodeTypeName === currentNodeTypeName) {
                        return config['NodeTypes'][i + 1];
                    }
                }

            } else {
                console.warn("TODO");
            }
        },

        currentNodeType: function() {
            var config = Workflows.controller.config;
            if (Workflows.selected) {

                if (Workflows.selected.descendants().length > 0) {
                    var selected = Workflows.selected;
                } else {
                    var selected = Workflows.selected.parent();
                }

                var currentNodeTypeName = selected.data('nodetype');
                for (var i = 0; i < config['NodeTypes'].length; i++) {
                    var nodeTypeName = Object.keys(config['NodeTypes'][i])[0];
                    if (nodeTypeName === currentNodeTypeName) {
                        return config['NodeTypes'][i];
                    }
                }

            } else {
                console.warn("TODO");
            }
        }
    },

    save: function() {
        var blob = new Blob([ JSON.stringify( cy.json() ) ], { type: 'application/javascript;charset=utf-8' });
        var saveAs = window.saveAs;
        saveAs(blob, "workflow-" + new Date().toISOString().slice(0,19).replace("T", "_").replace(/\:/g, "-") + ".json");

        // Workflows.formSubmitted = true;
        $('#workflow-save-warning').hide();
    },

    history: {
        initialize: function () {
            Workflows.history.index = 0;
            Workflows.history.stack = [{ action: 'initial state', elements: cy.elements().clone() }];
        },

        modify: function (action, modification) {
            if (typeof modification != 'undefined')
                modification();
            Workflows.history.stack.length = Workflows.history.index + 1; // Removes all "future" history after the current point.
            Workflows.history.index++;
            Workflows.history.stack.push({ action: action, elements: cy.elements().clone() });
            Workflows.history.setButtonState();
        },

        undo: function () {
            if (Workflows.history.index > 0) {
                Workflows.history.index--;
                Workflows.history.restore();
                cy.$(':selected').unselect();
            }
        },

        redo: function () {
            if (Workflows.history.index < (Workflows.history.stack.length - 1)) {
                Workflows.history.index++;
                Workflows.history.restore();
                cy.$(':selected').unselect();
            }
        },

        restore: function () {
            cy.elements().remove();
            Workflows.history.stack[Workflows.history.index].elements.restore();
            Workflows.history.setButtonState();
            Workflows.cancelState();
        },

        setButtonState: function () {
            if (Workflows.history.index < (Workflows.history.stack.length - 1)) {
                $('#workflow-toolbar-redo')
                    .removeClass('disabled')
                    .find('span')
                    .attr('title', 'Redo ' + Workflows.history.stack[Workflows.history.index + 1].action);
            } else {
                $('#workflow-toolbar-redo')
                    .addClass('disabled')
                    .find('span')
                    .attr('title', 'Redo');
            }

            if (Workflows.history.index > 0) {
                $('#workflow-save-warning').show();
                $('#workflow-toolbar-undo')
                    .removeClass('disabled')
                    .find('span')
                    .attr('title', 'Undo ' + Workflows.history.stack[Workflows.history.index].action);
            } else {
                $('#workflow-save-warning').hide();
                $('#workflow-toolbar-undo')
                    .addClass('disabled')
                    .find('span')
                    .attr('title', 'Undo');
            }
        }
    },


    fit: function() {
        // cy.panzoom();
        var defaultZoom = cy.maxZoom();
        cy.maxZoom(2);
        cy.fit(50);
        cy.maxZoom(defaultZoom);
        cy.center();
        cy.resize();
    }
};

$(document).ready(function () {

    var wfJsonElement = $('#workflow-content-json');
    var cytoscapeElement = $('#cy');
    var editable = cytoscapeElement.data('editable');
    var wfType = cytoscapeElement.data('workflow-type');

    var hideChildNodes = cytoscapeElement.data('hideChildNodes');


    var wfConfig = YAML.load('WorkflowConfig.yml');

    if (wfJsonElement.length && cytoscapeElement.length) {

        var cy = window.cy = cytoscape({
            container: cytoscapeElement[0],
            elements: JSON.parse(wfJsonElement.html()),
            layout: {
                name: 'preset',
                padding: 20
            },
            style: [
                {
                    selector: 'node',
                    css: {
                        'shape': 'roundrectangle',
                        'content': 'data(name)',
                        'background-color': function (ele) {
                            return (typeof ele.data('color') === 'undefined') ? "#f47d20" : ele.data('color')
                        },
                        'color': function (ele) {
                            return (typeof ele.data('font_color') === 'undefined') ? "#000000" : ele.data('font_color')
                        },
                        'background-opacity': 0.8,
                        'text-valign': 'center',
                        'text-halign': 'center',
                        // 'width': '150px',
                        'width': "data(width)",
                        'height': '30px',
                        'font-size': '9px',
                        'border-width': '1px',
                        'border-color': '#000',
                        'border-opacity': 0.5,
                        'text-wrap': 'wrap',
                        'text-max-width': '130px'
                    }
                },
                {
                    selector: '$node > node',
                    css: {
                        'shape': 'roundrectangle',
                        'content': function (e) {
                            return e.data('name') + ' (' + e.children().length + ')';
                        },
                        'padding-top': '10px',
                        'font-weight': 'bold',
                        'padding-left': '10px',
                        'padding-bottom': '10px',
                        'padding-right': '10px',
                        'text-valign': 'top',
                        'text-halign': 'center',
                        'text-margin-y': '-2px',
                        // 'width': '300px', // FIXME: should be auto
                        // width: "data(width)",
                        'height': '20px', // FIXME: should be auto
                        'font-size': '9px',
                        'color': '#111111'
                    }
                },
                {
                    selector: 'edge',
                    css: {
                        'target-arrow-shape': 'triangle',
                        'content': 'data(name)',
                        'line-color': '#ccc',
                        'source-arrow-color': '#ccc',
                        'target-arrow-color': '#ccc',
                        'font-size': '9px',
                        'curve-style': 'bezier'
                    }
                },
                {
                    selector: ':selected',
                    css: {
                        'line-color': '#2A62E4',
                        'target-arrow-color': '#2A62E4',
                        'source-arrow-color': '#2A62E4',
                        'border-width': '2px',
                        'border-color': '#2A62E4',
                        'border-opacity': 1,
                        'background-blacken': '-0.1'
                    }
                }
            ],
            userZoomingEnabled: false,
        });

        if (editable) {

            // check if wf type is known (i.e. there is such field in the WorkflowConfig.yml)
            if (wfConfig.hasOwnProperty(wfType)) {

                wfType = getParameterByName('type'); // || wfType; // FIXME: DEBUG

                console.log(wfType);

                var config = wfConfig[wfType];

                // Show somewhere typename
                var wfTypeName = config['WorkflowTypeName'];
                console.log("workflow type is", wfTypeName);

                // Decorate editor
                var hideToolbar = config['ConfigOptions']['hideToolbar'];
                var allowNodeReposition = config['ConfigOptions']['allowNodeReposition'];
                var wizard = config['ConfigOptions']['wizard'];

                if (hideToolbar) {
                    $('#workflow-toolbar-add').hide();
                } else {
                    $('#workflow-toolbar-add').show();
                }


                $('#workflow-toolbar-undo').click(Workflows.history.undo);
                $('#workflow-toolbar-redo').click(Workflows.history.redo);

                $('#workflow-toolbar-save').click(function(){
                   Workflows.save();
                });

                if (allowNodeReposition) {
                    cy.autoungrabify(false);
                } else {
                    cy.autoungrabify(true);
                }

                $('#workflow-status-bar').find('.node-context-operation-button').remove();

                $('#workflow-toolbar-back').click(function(){
                    if (Workflows.selected.descendants().length > 0) {
                        var selected = Workflows.selected;
                    } else {
                        var selected = Workflows.selected.parent();
                    }
                    if (selected.incomers().length > 0) {
                        var incomer = selected.incomers()[1];
                        Workflows.cancelState();
                        cy.$('#' + incomer.data('id')).select();
                    }
                });

                $('#workflow-toolbar-forward').click(function(){
                    if (Workflows.selected.descendants().length > 0) {
                        var selected = Workflows.selected;
                    } else {
                        var selected = Workflows.selected.parent();
                    }
                    if (selected.outgoers().length > 0) {
                        var outgoer = selected.outgoers()[1];
                        Workflows.cancelState();
                        cy.$('#' + outgoer.data('id')).select();
                    }
                });

                // $('#workflow-status-bar').find('.node-context-button').show();

                // cy.$(':selected').unselect();
                // cy.on('tap', Workflows.handleClick);
                // cy.on('select', function (e) {
                //     if (Workflows.state !== 'adding node') {
                //         Workflows.select(e.target);
                //     }
                // });
                // cy.on('unselect', Workflows.cancelState);
                // cy.on('drag', function () {
                //     Workflows._dragged = true;
                // });
                // cy.on('free', function () {
                //     if (Workflows._dragged) {
                //         Workflows.history.modify('move node');
                //         Workflows._dragged = false;
                //     }
                // });

                cy.on('select', Workflows.sidebar2.populate);

                Workflows.controller.config = config;

                var totalNodes = config['NodeTypes'].length;

                var node = config['NodeTypes'][0];
                Workflows.controller.init(node);

                Workflows.history.initialize();


                // $("#workflow-status-bar").show();
                // $("#workflow-toolbar-back").show();


                if (wizard) {
                    Workflows.controller.populate();

                    $("#workflow-diagram-sidebar-next").bind("next-please", function(){
                        node = Workflows.controller.nextNodeType() || Workflows.controller.currentNodeType();

                        Workflows.controller.init(node);
                        Workflows.controller.populate();

                        Workflows.fit();
                    });

                    $("#workflow-diagram-sidebar-repeat").bind("repeat-please", function(){
                        // Workflows.selected.data('');

                        node = Workflows.controller.currentNodeType();
                        Workflows.controller.init(node);
                        Workflows.controller.populate();
                        Workflows.fit();
                    });

                    cy.$(':selected').unselect();
                    cy.on('select', function (e) {
                        Workflows.select2(e.target);
                        Workflows.sidebar2.setButtonState(e.target);
                    });
                    cy.on('unselect', Workflows.cancelState);
                    cy.$('#node-0').select();

                } else {

                    /*
                    var tmpl = HandlebarsTemplates['workflows/edam-input'];
                    var $edam = $(tmpl());

                    $("#workflow-diagram-sidebar-desc").append($edam);

                    $edam.edam({
                        level: 0,
                        types: ["Operation"],
                        disclosed: 1
                        // types: ["Topic", "Operation"]
                    });
                    */


                    $('#workflow-toolbar-add').click(Workflows.setAddNodeState);
                    $('#workflow-toolbar-cancel').click(Workflows.cancelState);
                    $('#workflow-toolbar-edit').click(Workflows.edit);
                    $('#workflow-toolbar-link').click(Workflows.setLinkNodeState);

                    $('#workflow-toolbar-undo').hide();
                    $('#workflow-toolbar-redo').hide();
                    // $('#workflow-toolbar-add-child').click(Workflows.addChild);
                    $('#workflow-toolbar-delete').click(Workflows.delete);

                    cy.$(':selected').unselect();
                    cy.on('tap', Workflows.handleClick);
                    cy.on('select', function (e) {
                        if (Workflows.state !== 'adding node') {
                            Workflows.select(e.target);
                        }
                    });
                    cy.on('unselect', Workflows.cancelState);
                    cy.on('drag', function () {
                        Workflows._dragged = true;
                    });
                    cy.on('free', function () {
                        if (Workflows._dragged) {
                            // Workflows.history.modify('move node');
                            Workflows._dragged = false;
                        }
                    });

                }

                console.log(wfConfig);

            }

        } else {
            console.log('debug');
            // Hiding/revealing of child nodes
            if(hideChildNodes) {
                cy.style()
                    .selector('node > node').style({ 'opacity': 0 })
                    .selector('node > node.visible').style({ 'opacity': 1, 'transition-property': 'opacity', 'transition-duration': '0.2s' })
                    .selector('edge.hidden').style({ 'opacity': 0 })
                    .update();

                cy.$('node > node').connectedEdges().addClass('hidden');
            }
            cy.on('select', 'node', Workflows.sidebar.populate);
            cy.on('select', 'edge', function (e) {
                e.target.unselect();
                return false;
            });
        }

        // Workflows.sidebar.init();
        // cy.on('unselect', Workflows.sidebar.clear);
        // cy.$(':selected').unselect();
        // Workflows.loadLastSelection();

        cy.panzoom();
        var defaultZoom = cy.maxZoom();
        cy.maxZoom(2); // Temporary limit the zoom level, to restrict how zoomed-in the diagram appears by default
        cy.fit(50); // Fit diagram to screen with some padding around the edges
        cy.maxZoom(defaultZoom); // Reset the zoom limit to allow user to further zoom if they wish

        Split(['#workflow-diagram-content', '#workflow-diagram-sidebar'], {
            direction: 'horizontal',
            sizes: [70, 30],
            minSize: [100, 50],
            onDragEnd: function() {
                cy.resize();
            }
        });
    }


});


function getParameterByName(name, url) {
    if (!url) url = window.location.href;
    name = name.replace(/[\[\]]/g, "\\$&");
    var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
        results = regex.exec(url);
    if (!results) return null;
    if (!results[2]) return '';
    return decodeURIComponent(results[2].replace(/\+/g, " "));
}

require('./datatypes');
require('./layout');

Workflows.formSubmitted = false;
