(function(root) {


    root.WFJS = {};

    var $ = require('./vendor/jquery');
    var _ = require('./vendor/underscore');
    require('./vendor/bootstrap');
    var MarkdownIt = require('./vendor/markdown-it');
    var cytoscape = require('./vendor/cytoscape');
    var panzoom = require('./vendor/cytoscape-panzoom');

    panzoom( cytoscape );

    root.WFJS.cytoscape = cytoscape;

    var cy;


    var Split = require('./vendor/split');
    var FileSaver = require('./vendor/FileSaver');
    require('./vendor/jquery-ui');
    require('./vendor/yaml');

    // var EdamSelect = require('./edam-select');
    root.WFJS.EdamSelect = require('./edam-select');

    var YAML = window.YAML;


    var Handlebars = require('./vendor/handlebars.runtime');


    root.WFJS.HandlebarsTemplates = {
        'workflows/sidebar_content': require("../templates/sidebar_content.hbs"),

        'workflows/fields/MultipleChoice': require("../templates/multiple_choice.hbs"),
        'workflows/fields/Text': require("../templates/text.hbs"),

        // also partials
        'workflows/fields/MultipleChoiceAnswer': require("../templates/multiple_choice_answer.hbs"),
        'workflows/fields/TextInput': require("../templates/text_input.hbs"),


        // concept maps
        'workflows/EdamInput': require("../templates/edam_input.hbs"),
        'workflows/edam': require("../templates/edam.hbs"),

        'workflows/app': require("../templates/app.hbs")
    };


    var Workflows = {
        type: null,

        formSubmitted: false,

        handleClick: function (e) {
            if (root.WFJS.Workflows.state === 'adding node') {
                root.WFJS.Workflows.placeNode(e.position);
            } else if (root.WFJS.Workflows.state === 'linking node') {
                if (e.target && e.target !== cy && e.target.isNode()) {
                    root.WFJS.Workflows.createLink(e);
                }
            }
        },

        setState: function (state, message) {
            root.WFJS.Workflows.state = state;
            if (message)
                $('#workflow-status-message').html(message).show();
            var button = $('#workflow-toolbar-cancel');
            button.find('span').html('Cancel ' + state);
            button.show();
        },

        cancelState: function () {
            root.WFJS.Workflows.state = '';

            if (root.WFJS.Workflows.selected) {
                root.WFJS.Workflows.selected.unselect();
                root.WFJS.Workflows.selected = null;
            }

            $('#workflow-status-message').html('').hide();
            // $('#workflow-status-selected-node').html('<span class="muted">Nothing selected</span>').attr('title', '');
            $('#workflow-status-bar').find('.node-context-button').hide();
            $('#workflow-toolbar-cancel').hide();

            root.WFJS.Workflows.sidebar2.clear();
        },

        select: function (target) {
            if (target.isNode()) {
                root.WFJS.Workflows.selected = target;
                root.WFJS.Workflows.setState('node selection');
                $('#workflow-status-bar').find('.node-context-button').show();
                $('#workflow-status-selected-node').html(root.WFJS.Workflows.selected.data('name'))
                    .attr('title', root.WFJS.Workflows.selected.data('name'));
            } else if (target.isEdge()) {
                root.WFJS.Workflows.selected = target;
                root.WFJS.Workflows.setState('edge selection');
                $('#workflow-status-bar').find('.edge-context-button').show();
                $('#workflow-status-selected-node').html(root.WFJS.Workflows.selected.data('name') + ' (edge)')
                    .attr('title', root.WFJS.Workflows.selected.data('name') + ' (edge)');
            }
        },

        select2: function (target) {
            if (target.isNode()) {
                root.WFJS.Workflows.selected = target;
                $('#workflow-status-bar').find('.node-context-button').show();
            } else if (target.isEdge()) {
                root.WFJS.Workflows.selected = target;
            }
        },

        setAddNodeState: function () {
            root.WFJS.Workflows.cancelState();
            root.WFJS.Workflows.setState('adding node', 'Click on the diagram to add a new node.');
        },

        placeNode: function (position, parentId) {
            // Offset child nodes a bit so they don't stack on top of each other...
            var pos = {x: position.x, y: position.y};
            if (parentId && root.WFJS.Workflows.selected.children().length > 0)
                pos.y = root.WFJS.Workflows.selected.children().last().position().y + 40;

            root.WFJS.Workflows.controller.populate(pos);
            // Workflows.controller.counter += 1;
            // Workflows.sidebar2.populate(parentId ? 'Add child node' : 'Add node', { parent: parentId }, pos);

            // $('#node-modal').modal('show');
        },

        addNode: function () {
            var node = root.WFJS.Workflows.nodeModal.fetch();
            $('#node-modal').modal('hide');

            root.WFJS.Workflows.history.modify(node.data.parent ? 'add child node' : 'add node', function () {
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
            root.WFJS.Workflows.placeNode(root.WFJS.Workflows.selected.position(), root.WFJS.Workflows.selected.id());
        },

        edit: function () {
            if (root.WFJS.Workflows.state === 'node selection') {
                root.WFJS.Workflows.nodeModal.populate('Edit node', root.WFJS.Workflows.selected.data(), root.WFJS.Workflows.selected.position());
            } else if (root.WFJS.Workflows.state === 'edge selection') {
                $('#edge-modal').modal('show');
                $('#edge-modal-form-label').val(root.WFJS.Workflows.selected.data('name'));
            }
        },

        updateNode: function () {
            var node = root.WFJS.Workflows.selected;

            root.WFJS.Workflows.history.modify('edit node', function () {
                node.data(root.WFJS.Workflows.nodeModal.fetch().data);
            });

            $('#node-modal').modal('hide');
            node.select();
        },

        updateEdge: function () {
            var edge = root.WFJS.Workflows.selected;

            root.WFJS.Workflows.history.modify('edit edge', function () {
                edge.data('name', $('#edge-modal-form-label').val());
            });

            $('#edge-modal').modal('hide');
            edge.select();
        },

        nodeModalConfirm: function () {
            $('#node-modal-form-id').val() ? root.WFJS.Workflows.updateNode() : root.WFJS.Workflows.addNode();
        },

        edgeModalConfirm: function () {
            root.WFJS.Workflows.updateEdge();
        },

        setLinkNodeState: function () {
            root.WFJS.Workflows.setState('linking node', 'Click on a node to create a link.');
        },

        createLink: function (e) {
            // Workflows.history.modify('link', function () {
            e.cy.add({
                group: "edges",
                data: {
                    source: root.WFJS.Workflows.selected.data('id'),
                    target: e.target.data('id')
                }
            });
            // });

            root.WFJS.Workflows.cancelState();
        },

        delete: function () {
            if (confirm('Are you sure you wish to delete this?')) {
                root.WFJS.Workflows.history.modify('delete', function () {
                    root.WFJS.Workflows.selected.remove();
                });

                root.WFJS.Workflows.cancelState();
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
                root.WFJS.Workflows.associatedResources.populate(data.associatedResources || []);
                root.WFJS.Workflows.ontologyTerms.populate(data.ontologyTerms || []);
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
                        associatedResources: root.WFJS.Workflows.associatedResources.fetch(),
                        ontologyTerms: root.WFJS.Workflows.ontologyTerms.fetch()
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
            unhighlight: function () {
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

            setButtonState: function (target) {
                if (target.isNode()) {
                    try {
                        $("#workflow-diagram-sidebar-next").text("Add a " + Object.keys(Workflows.controller.nextNodeType())[0]);
                        $("#workflow-diagram-sidebar-repeat").text("Repeat a " + Object.keys(Workflows.controller.currentNodeType())[0]);
                    } catch (err) {
                        // TODO: something with params consistency and so on
                    }
                }
            },

            populate: function (e) {
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
                        (function (child) {
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
                                    $fieldNode = root.WFJS.Workflows.DataTypeView.Text.render(field);
                                    break;
                                case "MultipleChoice":
                                    $fieldNode = root.WFJS.Workflows.DataTypeView.MultipleChoice.render(field);
                                    break;
                                case "OperationOntologyTerm":
                                    $fieldNode = root.WFJS.Workflows.DataTypeView.OperationOntologyTerm.render(field);
                                    break;

                                case "InputTypeOntologyTerm":
                                    $fieldNode = root.WFJS.Workflows.DataTypeView.InputTypeOntologyTerm.render(field);
                                    break;

                                case "OutputTypeOntologyTerm":
                                    $fieldNode = root.WFJS.Workflows.DataTypeView.OutputTypeOntologyTerm.render(field);
                                    break;

                                case "FormatTypeOntologyTerm":
                                    $fieldNode = root.WFJS.Workflows.DataTypeView.OutputTypeOntologyTerm.render(field);
                                    break;
                            }


                            $desk.append($fieldNode);


                            if ($desk.find(".edam")) {

                                var edamSelect = new root.WFJS.EdamSelect($desk.find(".edam")[0], {
                                    initDepth: 1,
                                    type: 'data',
                                    inline: false,
                                    opened: true,
                                    maxHeight: 300,
                                    multiselect: true,
                                });
                            }
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
                        root.WFJS.Workflows.sidebar2.unhighlight();
                        root.WFJS.Workflows.sidebar2.highlight(e.target.data('id'), e.target.data('color'));

                    }

                    // set buttons' events
                    $("#workflow-diagram-sidebar-next").unbind("click.next");
                    $("#workflow-diagram-sidebar-repeat").unbind("click.repeat");

                    $("#workflow-diagram-sidebar-next").bind("click.next", function () {
                        $("#workflow-diagram-sidebar-next").trigger("next-please");
                    });

                    $("#workflow-diagram-sidebar-repeat").bind("click.repeat", function () {
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

            getNodeName: function (node) {

            },

            init: function (node) {
                var nodeTypeName = Object.keys(node)[0];
                var nodeType = node[nodeTypeName];

                var name = nodeType['NodeTypeName'];
                var colour = nodeType['Colour'] || "#bbbbbb"; // default
                var fontColour = nodeType['FontColour'] || "#00082b"; // default
                var promptPosition = nodeType['PromptPosition'];
                var required = nodeType['Required'];
                var multiple = nodeType['Multiple'];

                var fields = _.map(nodeType['Fields'], function (data, i) {
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
                root.WFJS.Workflows.controller.params = {
                    name: name,
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


            populate: function (position) { // TODO: find the word reflecting the purpose of this fn

                console.log(position);

                var params = Workflows.controller.params;

                cy.add({
                    data: {
                        type: "node",
                        id: "node-" + root.WFJS.Workflows.controller.counter,
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

                    if (root.WFJS.Workflows.selected) {
                        if (root.WFJS.Workflows.selected.descendants().length > 0) {
                            var selected = root.WFJS.Workflows.selected;
                        } else {
                            var selected = root.WFJS.Workflows.selected.parent();
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
                                    target: "node-" + root.WFJS.Workflows.controller.counter
                                }
                            });

                            cy.add({
                                group: "edges",
                                data: {
                                    source: "node-" + root.WFJS.Workflows.controller.counter,
                                    target: outgoer.data('id')
                                }
                            });

                            successors.shift('x', 200);

                        } else {
                            cy.add({
                                group: "edges",
                                data: {
                                    source: selected.data('id'),
                                    target: "node-" + root.WFJS.Workflows.controller.counter
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
                        if (root.WFJS.Workflows.selected) {
                            if (root.WFJS.Workflows.selected.descendants().length > 0) {
                                origX = parseInt(root.WFJS.Workflows.selected.descendants()[0].position().x) + 200;
                            } else {
                                origX = parseInt(root.WFJS.Workflows.selected.position().x) + 200;
                            }
                        }

                        var calcPosition = root.WFJS.Workflows.Layout.vertical({
                            origX: origX,
                            origY: 0,
                            shiftY: 50
                        });
                        break;
                    case "Operation":
                        var calcPosition = root.WFJS.Workflows.Layout.operation({
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
                            parent: "node-" + root.WFJS.Workflows.controller.counter,
                            id: "node-" + root.WFJS.Workflows.controller.counter + "-" + i,
                            name: field.name,
                            color: params.color,
                            type: "field",
                            font_color: params.font_color,
                            datatype: field.datatype, // Text -> MultiText?
                            required: field.required,
                            info: field.info,
                            multiple: field.multiple,
                            data: root.WFJS.Workflows.DataType[field.datatype].init(),
                            width: width
                        },
                        position: pos,

                    });

                    if (i > 0) { // add property like "connected"
                        cy.add({
                            group: "edges",
                            data: {
                                source: "node-" + root.WFJS.Workflows.controller.counter + "-" + (i - 1),
                                target: "node-" + root.WFJS.Workflows.controller.counter + "-" + i
                            }
                        });
                    }
                });

                // Workflows.history


                root.WFJS.Workflows.cancelState();
                cy.$(':selected').unselect();
                cy.$('#' + "node-" + root.WFJS.Workflows.controller.counter).select();

                root.WFJS.Workflows.history.modify("test"); // TODO: message


                root.WFJS.Workflows.controller.counter += 1;
            },

            nextNodeType: function () {
                var config = root.WFJS.Workflows.controller.config;
                if (root.WFJS.Workflows.selected) {

                    if (root.WFJS.Workflows.selected.descendants().length > 0) {
                        var selected = root.WFJS.Workflows.selected;
                    } else {
                        var selected = root.WFJS.Workflows.selected.parent();
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

            currentNodeType: function () {
                var config = Workflows.controller.config;
                if (root.WFJS.Workflows.selected) {

                    if (root.WFJS.Workflows.selected.descendants().length > 0) {
                        var selected = root.WFJS.Workflows.selected;
                    } else {
                        var selected = root.WFJS.Workflows.selected.parent();
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

        save: function () {
            var blob = new Blob([JSON.stringify(cy.json())], {type: 'application/javascript;charset=utf-8'});
            // var saveAs = window.saveAs;
            FileSaver.saveAs(blob, "workflow-" + new Date().toISOString().slice(0, 19).replace("T", "_").replace(/\:/g, "-") + ".json");

            // Workflows.formSubmitted = true;
            $('#workflow-save-warning').hide();
        },

        history: {
            initialize: function () {
                root.WFJS.Workflows.history.index = 0;
                root.WFJS.Workflows.history.stack = [{action: 'initial state', elements: cy.elements().clone()}];
            },

            modify: function (action, modification) {
                if (typeof modification != 'undefined')
                    modification();
                root.WFJS.Workflows.history.stack.length = root.WFJS.Workflows.history.index + 1; // Removes all "future" history after the current point.
                root.WFJS.Workflows.history.index++;
                root.WFJS.Workflows.history.stack.push({action: action, elements: cy.elements().clone()});
                root.WFJS.Workflows.history.setButtonState();
            },

            undo: function () {
                if (root.WFJS.Workflows.history.index > 0) {
                    root.WFJS.Workflows.history.index--;
                    root.WFJS.Workflows.history.restore();
                    cy.$(':selected').unselect();
                }
            },

            redo: function () {
                if (root.WFJS.Workflows.history.index < (root.WFJS.Workflows.history.stack.length - 1)) {
                    root.WFJS.Workflows.history.index++;
                    root.WFJS.Workflows.history.restore();
                    cy.$(':selected').unselect();
                }
            },

            restore: function () {
                cy.elements().remove();
                root.WFJS.Workflows.history.stack[root.WFJS.Workflows.history.index].elements.restore();
                root.WFJS.Workflows.history.setButtonState();
                root.WFJS.Workflows.cancelState();
            },

            setButtonState: function () {
                if (root.WFJS.Workflows.history.index < (root.WFJS.Workflows.history.stack.length - 1)) {
                    $('#workflow-toolbar-redo')
                        .removeClass('disabled')
                        .find('span')
                        .attr('title', 'Redo ' + root.WFJS.Workflows.history.stack[root.WFJS.Workflows.history.index + 1].action);
                } else {
                    $('#workflow-toolbar-redo')
                        .addClass('disabled')
                        .find('span')
                        .attr('title', 'Redo');
                }

                if (root.WFJS.Workflows.history.index > 0) {
                    $('#workflow-save-warning').show();
                    $('#workflow-toolbar-undo')
                        .removeClass('disabled')
                        .find('span')
                        .attr('title', 'Undo ' + root.WFJS.Workflows.history.stack[root.WFJS.Workflows.history.index].action);
                } else {
                    $('#workflow-save-warning').hide();
                    $('#workflow-toolbar-undo')
                        .addClass('disabled')
                        .find('span')
                        .attr('title', 'Undo');
                }
            }
        },


        fit: function () {
            // cy.panzoom();
            var defaultZoom = cy.maxZoom();
            cy.maxZoom(2);
            cy.fit(50);
            cy.maxZoom(defaultZoom);
            cy.center();
            cy.resize();
        },
        load: function(data){
            // console.log(cy);
            // var cy = $("#cy").cytoscape("get");
            // cy.load(data, function () {
            //     console.log(cy.nodes().length);
            //     console.log(cy.edges().length);
            // }, function () {
            //     console.log('layout done');
            // });
        },

        init: function (params) {

            params.$el.html($(WFJS.HandlebarsTemplates['workflows/app']()));

            require('./datatypes');
            require('./layout');

            // params.load

            var wfJsonElement = $('#workflow-content-json');
            var cytoscapeElement = $('#cy');
            var editable = cytoscapeElement.data('editable');

            var wfType = params.type;
            root.WFJS.Workflows.save = params.save;

            cytoscapeElement.data('workflow-type', wfType);

            var hideChildNodes = cytoscapeElement.data('hideChildNodes');


            var wfConfig = YAML.load('WorkflowConfig.yml');

            if (wfJsonElement.length && cytoscapeElement.length) {

                cy = root.WFJS.cytoscape({
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

                        // wfType = 'EducationalResource'; // getParameterByName('type'); // || wfType; // FIXME: DEBUG

                        // console.log(wfType);


                        var config = wfConfig[wfType];

                        // Show somewhere typename
                        var wfTypeName = config['WorkflowTypeName'];
                        // console.log("workflow type is", wfTypeName);

                        // Decorate editor
                        var hideToolbar = config['ConfigOptions']['hideToolbar'];
                        var allowNodeReposition = config['ConfigOptions']['allowNodeReposition'];
                        var wizard = config['ConfigOptions']['wizard'];

                        if (hideToolbar) {
                            $('#workflow-toolbar-add').hide();
                        } else {
                            $('#workflow-toolbar-add').show();
                        }


                        $('#workflow-toolbar-undo').click(root.WFJS.Workflows.history.undo);
                        $('#workflow-toolbar-redo').click(root.WFJS.Workflows.history.redo);

                        $('#workflow-toolbar-save').click(function () {
                            root.WFJS.Workflows.save();
                        });

                        if (allowNodeReposition) {
                            cy.autoungrabify(false);
                        } else {
                            cy.autoungrabify(true);
                        }

                        $('#workflow-status-bar').find('.node-context-operation-button').remove();

                        $('#workflow-toolbar-back').click(function () {
                            if (root.WFJS.Workflows.selected.descendants().length > 0) {
                                var selected = root.WFJS.Workflows.selected;
                            } else {
                                var selected = root.WFJS.Workflows.selected.parent();
                            }
                            if (selected.incomers().length > 0) {
                                var incomer = selected.incomers()[1];
                                root.WFJS.Workflows.cancelState();
                                cy.$('#' + incomer.data('id')).select();
                            }
                        });

                        $('#workflow-toolbar-forward').click(function () {
                            if (root.WFJS.Workflows.selected.descendants().length > 0) {
                                var selected = root.WFJS.Workflows.selected;
                            } else {
                                var selected = root.WFJS.Workflows.selected.parent();
                            }
                            if (selected.outgoers().length > 0) {
                                var outgoer = selected.outgoers()[1];
                                root.WFJS.Workflows.cancelState();
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

                        cy.on('select', root.WFJS.Workflows.sidebar2.populate);

                        root.WFJS.Workflows.controller.config = config;

                        var totalNodes = config['NodeTypes'].length;

                        var node = config['NodeTypes'][0];
                        root.WFJS.Workflows.controller.init(node);

                        root.WFJS.Workflows.history.initialize();


                        // $("#workflow-status-bar").show();
                        // $("#workflow-toolbar-back").show();


                        if (wizard) {
                            Workflows.controller.populate();

                            $("#workflow-diagram-sidebar-next").bind("next-please", function () {
                                node = root.WFJS.Workflows.controller.nextNodeType() || root.WFJS.Workflows.controller.currentNodeType();

                                root.WFJS.Workflows.controller.init(node);
                                root.WFJS.Workflows.controller.populate();

                                root.WFJS.Workflows.fit();
                            });

                            $("#workflow-diagram-sidebar-repeat").bind("repeat-please", function () {
                                // Workflows.selected.data('');

                                node = root.WFJS.Workflows.controller.currentNodeType();
                                root.WFJS.Workflows.controller.init(node);
                                root.WFJS.Workflows.controller.populate();
                                root.WFJS.Workflows.fit();
                            });

                            cy.$(':selected').unselect();
                            cy.on('select', function (e) {
                                root.WFJS.Workflows.select2(e.target);
                                root.WFJS.Workflows.sidebar2.setButtonState(e.target);
                            });
                            cy.on('unselect', root.WFJS.Workflows.cancelState);
                            cy.$('#node-0').select();

                        } else {

                            // console.log(123)
                            //
                            // var tmpl = root.WFJS.HandlebarsTemplates['workflows/EdamInput'];
                            // var $edam = $(tmpl({}));
                            //
                            // $("#workflow-diagram-sidebar-desc").append($edam);

                            // var edamSelect = new root.WFJS.EdamSelect($edam.find('.edam')[0], {
                            //     initDepth: 1,
                            //     type: 'data',
                            //     inline: false,
                            //     opened: true,
                            //     maxHeight: 300,
                            //     multiselect: true,
                            // });



                            $('#workflow-toolbar-add').click(root.WFJS.Workflows.setAddNodeState);
                            $('#workflow-toolbar-cancel').click(root.WFJS.Workflows.cancelState);
                            $('#workflow-toolbar-edit').click(root.WFJS.Workflows.edit);
                            $('#workflow-toolbar-link').click(root.WFJS.Workflows.setLinkNodeState);

                            $('#workflow-toolbar-undo').hide();
                            $('#workflow-toolbar-redo').hide();
                            // $('#workflow-toolbar-add-child').click(Workflows.addChild);
                            $('#workflow-toolbar-delete').click(root.WFJS.Workflows.delete);

                            cy.$(':selected').unselect();
                            cy.on('tap', root.WFJS.Workflows.handleClick);
                            cy.on('select', function (e) {
                                if (root.WFJS.Workflows.state !== 'adding node') {
                                    root.WFJS.Workflows.select(e.target);
                                }
                            });
                            cy.on('unselect', Workflows.cancelState);
                            cy.on('drag', function () {
                                root.WFJS.Workflows._dragged = true;
                            });
                            cy.on('free', function () {
                                if (root.WFJS.Workflows._dragged) {
                                    // Workflows.history.modify('move node');
                                    root.WFJS.Workflows._dragged = false;
                                }
                            });

                        }

                        console.log(wfConfig);

                    }

                } else {
                    console.log('debug');
                    // Hiding/revealing of child nodes
                    if (hideChildNodes) {
                        cy.style()
                            .selector('node > node').style({'opacity': 0})
                            .selector('node > node.visible').style({
                            'opacity': 1,
                            'transition-property': 'opacity',
                            'transition-duration': '0.2s'
                        })
                            .selector('edge.hidden').style({'opacity': 0})
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
                    onDragEnd: function () {
                        cy.resize();
                    }
                });
            }




        }
    };

    root.WFJS.Workflows = Workflows;

    $(document).ready(function () {

        // WFJS.Workflows.type = "EducationalResource";

        root.WFJS.Workflows.init({
            type: "ConceptMap",
            save: function () {
                console.log("save!")
            },
            $el: $("#app")
        });


        var data = "{\"elements\":{\"nodes\":[{\"data\":{\"type\":\"node\",\"id\":\"node-0\",\"name\":\"Learning Objectives and Outcomes\",\"color\":\"#802301\",\"font_color\":\"#ffffff\",\"nodetype\":\"LearningObejectivesAndOutcomes\",\"multiple\":false,\"width\":500},\"position\":{\"x\":0,\"y\":75},\"group\":\"nodes\",\"removed\":false,\"selected\":true,\"selectable\":true,\"locked\":false,\"grabbable\":true,\"classes\":\"\"},{\"data\":{\"parent\":\"node-0\",\"id\":\"node-0-0\",\"name\":\"Learning Outcomes\",\"color\":\"#802301\",\"type\":\"field\",\"font_color\":\"#ffffff\",\"datatype\":\"Text\",\"required\":true,\"info\":\"This step is designed to make you think about what the user… blah blah\",\"multiple\":true,\"data\":{\"inputs\":[\"\"]},\"width\":200},\"position\":{\"x\":0,\"y\":50},\"group\":\"nodes\",\"removed\":false,\"selected\":false,\"selectable\":true,\"locked\":false,\"grabbable\":true,\"classes\":\"\"},{\"data\":{\"parent\":\"node-0\",\"id\":\"node-0-1\",\"name\":\"Learning Objectives\",\"color\":\"#802301\",\"type\":\"field\",\"font_color\":\"#ffffff\",\"datatype\":\"Text\",\"required\":true,\"info\":\"This step is designed to make you think about what the user… blah blah\",\"multiple\":true,\"data\":{\"inputs\":[\"\"]},\"width\":200},\"position\":{\"x\":0,\"y\":100},\"group\":\"nodes\",\"removed\":false,\"selected\":false,\"selectable\":true,\"locked\":false,\"grabbable\":true,\"classes\":\"\"}],\"edges\":[{\"data\":{\"source\":\"node-0-0\",\"target\":\"node-0-1\",\"id\":\"c979b8c6-0991-43f1-a74d-45f3cfffad3a\"},\"position\":{},\"group\":\"edges\",\"removed\":false,\"selected\":false,\"selectable\":true,\"locked\":false,\"grabbable\":true,\"classes\":\"\"}]},\"style\":[{\"selector\":\"node\",\"style\":{\"shape\":\"roundrectangle\",\"label\":\"data(name)\",\"background-color\":\"fn\",\"color\":\"fn\",\"background-opacity\":\"0.8\",\"text-valign\":\"center\",\"text-halign\":\"center\",\"width\":\"data(width)\",\"height\":\"30px\",\"font-size\":\"9px\",\"border-width\":\"1px\",\"border-color\":\"#000\",\"border-opacity\":\"0.5\",\"text-wrap\":\"wrap\",\"text-max-width\":\"130px\"}},{\"selector\":\"$node > node\",\"style\":{\"shape\":\"roundrectangle\",\"label\":\"fn\",\"padding\":\"10px\",\"font-weight\":\"bold\",\"text-valign\":\"top\",\"text-halign\":\"center\",\"text-margin-y\":\"-2px\",\"height\":\"20px\",\"font-size\":\"9px\",\"color\":\"#111111\"}},{\"selector\":\"edge\",\"style\":{\"target-arrow-shape\":\"triangle\",\"label\":\"data(name)\",\"line-color\":\"#ccc\",\"source-arrow-color\":\"#ccc\",\"target-arrow-color\":\"#ccc\",\"font-size\":\"9px\",\"curve-style\":\"bezier\"}},{\"selector\":\":selected\",\"style\":{\"line-color\":\"#2A62E4\",\"target-arrow-color\":\"#2A62E4\",\"source-arrow-color\":\"#2A62E4\",\"border-width\":\"2px\",\"border-color\":\"#2A62E4\",\"border-opacity\":\"1\",\"background-blacken\":\"-0.1\"}}],\"zoomingEnabled\":true,\"userZoomingEnabled\":false,\"zoom\":2,\"minZoom\":1e-50,\"maxZoom\":1e+50,\"panningEnabled\":true,\"userPanningEnabled\":true,\"pan\":{\"x\":574.5,\"y\":194},\"boxSelectionEnabled\":true,\"renderer\":{\"name\":\"canvas\"}}";

        root.WFJS.Workflows.load(data);

        // WFJS.Workflows.load();

    });


})(window);