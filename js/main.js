var MarkdownIt = window.markdownit();

var Workflows = {
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
        console.log(111);
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

                $("#workflow-diagram-sidebar-next").show();

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
                            type: child.data('datatype'),
                            name: child.data('name'),
                            required: child.data('required'),
                            multiple: child.data('multiple'),
                            forms: child.data('forms'),
                            info: child.data('info'),
                            id: child.data('id'),
                            correct: child.data('correct')
                        };

                        // console.log(field);

                        var $fieldNode = $(HandlebarsTemplates['workflows/fields/' + field.type](field));

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


                        if (field.type === "edam_operation") {
                            $fieldNode.find('input').autocomplete({
                                serviceUrl: 'http://193.40.11.103/edam/operations', // https://tess.elixir-europe.org/edam/operations
                                dataType: 'json',
                                deferRequestBy: 150,
                                paramName: 'filter',
                                transformResult: function (response) {
                                    // console.log(response);
                                    return {
                                        suggestions: $.map(response, function (item) {
                                            return {value: item['Preferred Label'], data: item};
                                        })
                                    };
                                },
                                onSelect: function (suggestion) {
                                    $(this).val('');
                                    $fieldNode.find('input').val(suggestion.value);
                                    Workflows.ontologyTerms.add(suggestion);
                                },
                                onSearchStart: function () {
                                    $(this).addClass('loading');
                                },
                                onSearchComplete: function () {
                                    $(this).removeClass('loading');
                                }
                            });
                        }

                        if (field.type === "edam_input" || field.type === "edam_output") {
                            $fieldNode.find('input').autocomplete({
                                serviceUrl: 'http://193.40.11.103/edam/data', // https://tess.elixir-europe.org/edam/operations
                                dataType: 'json',
                                deferRequestBy: 150,
                                paramName: 'filter',
                                transformResult: function (response) {
                                    // console.log(response);
                                    return {
                                        suggestions: $.map(response, function (item) {
                                            return {value: item['Preferred Label'], data: item};
                                        })
                                    };
                                },
                                onSelect: function (suggestion) {
                                    $(this).val('');
                                    $fieldNode.find('input').val(suggestion.value);
                                    Workflows.ontologyTerms.add(suggestion);
                                },
                                onSearchStart: function () {
                                    $(this).addClass('loading');
                                },
                                onSearchComplete: function () {
                                    $(this).removeClass('loading');
                                }
                            });
                        }

                        if (field.type === "edam_format") {
                            $fieldNode.find('input').autocomplete({
                                serviceUrl: 'http://193.40.11.103/edam/formats', // https://tess.elixir-europe.org/edam/operations
                                dataType: 'json',
                                deferRequestBy: 150,
                                paramName: 'filter',
                                transformResult: function (response) {
                                    // console.log(response);
                                    return {
                                        suggestions: $.map(response, function (item) {
                                            return {value: item['Preferred Label'], data: item};
                                        })
                                    };
                                },
                                onSelect: function (suggestion) {
                                    $(this).val('');
                                    $fieldNode.find('input').val(suggestion.value);
                                    Workflows.ontologyTerms.add(suggestion);
                                },
                                onSearchStart: function () {
                                    $(this).addClass('loading');
                                },
                                onSearchComplete: function () {
                                    $(this).removeClass('loading');
                                }
                            });
                        }

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
        params: {}, // configuration of the current node type

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
                    var type;
                    switch (data['DataType']) {
                        case "Text":
                            type = "text";
                            break;
                        case "MultipleChoice":
                            type = "multichoice";
                            break;
                        case "OperationOntologyTerm":
                            type = "edam_operation";
                            break;
                        case "InputTypeOntologyTerm":
                            type = "edam_input";
                            break;
                        case "OutputTypeOntologyTerm":
                            type = "edam_output";
                            break;
                        case "FormatTypeOntologyTerm":
                            type = "edam_format";
                            break;
                        case "boolean":
                            type = "boolean";
                            break;

                    }


                    return {
                        type: type,
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
                    multiple: params.multiple
                }
            });

            if (position) {

            } else { // if there is no position we are in sequential mode
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

                        // for (var i = 0; i < successors.length; i++) {
                        //     if (successors[i].isNode()) {
                        //         var children = successors[i].descendants();
                        //         for (var j = 0; j < children.length; j++) {
                        //             children[j].position.x = children[j].position().x + 200
                        //         }
                        //     }
                        // }


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

            _.each(params.fields, function (field, i) {
                var pos;
                if (position) {
                    pos = {
                        x: position.x,
                        y: position.y + (i * 50)
                    }
                } else {
                    if (Workflows.selected) {
                        if (Workflows.selected.descendants().length > 0) {
                            pos = {
                                x: parseInt(Workflows.selected.descendants()[0].position().x) + 200,
                                y: i * 50
                            }
                        } else {
                            pos = {
                                x: parseInt(Workflows.selected.position().x) + 200,
                                y: i * 50
                            }
                        }

                    } else {
                        pos = {
                            x: 0,
                            y: i * 50
                        }
                    }
                }

                cy.add({
                    data: {
                        parent: "node-" + Workflows.controller.counter,
                        id: "node-" + Workflows.controller.counter + "-" + i,
                        name: field.name,
                        color: params.color,
                        type: "field",
                        font_color: params.font_color,
                        datatype: field.type, // Text -> MultiText?
                        required: field.required,
                        info: field.info,
                        multiple: field.multiple,
                        forms: field.type === 'multiple' ? ["", ""] : [""], // FIXME: hack
                        correct: []
                    },
                    position: pos
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

            Workflows.history.modify("test");


            Workflows.controller.counter += 1;
        }
    },

    sidebar: {
        init: function () {
            var sidebar = $('#workflow-diagram-sidebar');
            sidebar.data('initialState', sidebar.html());
            sidebar.html('');
        },

        populate: function (e) {
            if (e.target.isNode()) {
                // Hide all expanded nodes and edges not related to this one
                var relatives = e.target.ancestors().descendants();
                var unrelated = cy.$('.visible').difference(relatives);
                unrelated.removeClass('visible');
                unrelated.connectedEdges().addClass('hidden');

                // Show parents if they are hidden
                relatives.addClass('visible').connectedEdges().removeClass('hidden');

                // Show child nodes and their edges
                if (e.target.isParent()) {
                    e.target.children().addClass('visible').connectedEdges().removeClass('hidden');
                }

                if (!e.target.data('html_description') && e.target.data('description')) {
                    e.target.data('html_description', MarkdownIt.render(e.target.data('description')));
                }

                var resources = e.target.data('associatedResources');
                if (resources && resources.length > 0){
                    for(var i = 0; i < resources.length; i++) {
                        var resource = resources[i];
                        var uri = URI.parse(resource.url);
                        if (uri.hostname == 'bio.tools') {
                            var id = uri.path.split('/')[2];
                            Biotools.displayToolInfo(id);
                            resource.id =id
                        }
                    }
                }
                e.target.data('associatedResources', resources);

                $('#workflow-diagram-sidebar-title').html(e.target.data('name') || '<span class="muted">Untitled</span>')
                    .css('background-color', e.target.data('color'))
                    .css('color', e.target.data('font_color'));
                $('#workflow-diagram-sidebar-desc').html(HandlebarsTemplates['workflows/sidebar_content'](e.target.data()));

                Workflows.storeLastSelection();

                var zoom = 1.8;
                // Fit the view to the selected thing if it will be too big to fit in the viewport when zoomed
                if ((e.target.width() * zoom) > (cy.width() * 0.9)) {
                    cy.animate({ fit: { eles: e.target.children().union(e.target), padding: 40 }, duration: 300 })
                } else { // Or just zoom in on it
                    cy.animate({ center: { eles: e.target }, zoom: zoom, duration: 300 })
                }

            } else if (e.target.isEdge()) {
                var title = $('#workflow-diagram-sidebar-title');
                if (e.target.data('name')) {
                    title.html(e.target.data('name') + ' (edge)');
                } else {
                    title.html('<span class="muted">Untitled (edge)</span>');
                }

                title.css('background-color', '')
                    .css('color', '');
            }
        },

        clear: function () {
            var sidebar = $('#workflow-diagram-sidebar');
            sidebar.html(sidebar.data('initialState'));
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

    associatedResources: {
        types: {
            materials: { icon: 'fa-book' },
            events: {icon: 'fa-calendar'},
            tools: { icon: 'fa-wrench' },
            policies: { icon: 'fa-file-text-o' }
        },

        // Add a new blank form for an associated resource
        add: function () {
            var type = $(this).data('resourceType');
            var template = HandlebarsTemplates['workflows/associated_resource_form'];

            $('#node-modal-associated-resource-list').append(template({
                type: type,
                icon: Workflows.associatedResources.types[type].icon
            }));

            return false;
        },

        delete: function () {
            $(this).parents('.associated-resource').remove();
            return false;
        },

        // Fetch the associated resources from the modal. Returns an array of objects that can be added to a node's data
        fetch: function (node) {
            var resources = [];
            $('#node-modal-associated-resource-list .associated-resource').each(function () {
                // "data-attribute" is just something I made up so I could identify the two form fields.
                // If I used the standard "name", they would end up getting posted to the server when the main workflow form is submitted.
                var resource = {
                    title: $('[data-attribute=title]', $(this)).val(),
                    url: $('[data-attribute=url]', $(this)).val(),
                    type: $('[data-attribute=type]', $(this)).val()
                };

                // Detect if URL is internal, and make it relative
                var base = window.location.toString().split('/workflows')[0];
                if (resource.url.indexOf(base) !== -1) {
                    resource.url = resource.url.substr(base.length)
                }

                if (resource.url && resource.title) {
                    resources.push(resource);
                }
            });

            return resources;
        },

        // Populate the modal with existing associated resource forms that can be edited by the user
        populate: function (resources) {
            var resourceList = $('#node-modal-associated-resource-list');
            resourceList.html('');

            for(var i = 0; i < resources.length; i++) {
                var resource = resources[i];
                resource.icon = Workflows.associatedResources.types[resource.type].icon;
                resourceList.append(
                    HandlebarsTemplates['workflows/associated_resource_form'](resource)
                );
            }
        }
    },

    ontologyTerms: {
        add: function (suggestion) {
            var template = HandlebarsTemplates['workflows/ontology_term_form'];

            $('#node-modal-ontology-terms-list').append(template({
                label: suggestion.data['Preferred Label'],
                uri: suggestion.data['Class ID']
            }));

            return false;
        },

        delete: function () {
            console.log(111);
            $(this).parents('.ontology-term').remove();
            return false;
        },

        fetch: function (node) {
            return $('#node-modal-ontology-terms-list .ontology-term').map(function () {
                return { label: $(this).data('attributeLabel'),
                    uri: $(this).data('attributeUrl')
                };
            }).toArray();
        },

        populate: function (resources) {
            var resourceList = $('#node-modal-ontology-terms-list');
            resourceList.html('');

            for(var i = 0; i < resources.length; i++) {
                resourceList.append(
                    HandlebarsTemplates['workflows/ontology_term_form'](resources[i])
                );
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
                        'width': '150px',
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
                        'width': '300px', // FIXME: should be auto
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
                var currentNode = 0;
                var totalNodes = config['NodeTypes'].length;

                var node = config['NodeTypes'][currentNode];
                Workflows.controller.init(node);

                Workflows.history.initialize();


                // $("#workflow-status-bar").show();
                // $("#workflow-toolbar-back").show();


                function nextNodeType() {
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
                }

                function currentNodeType() {
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


                if (wizard) {
                    Workflows.controller.populate();

                    $("#workflow-diagram-sidebar-next").bind("next-please", function(){
                        node = nextNodeType() || currentNodeType();

                        Workflows.controller.init(node);
                        Workflows.controller.populate();

                        Workflows.fit();
                    });

                    $("#workflow-diagram-sidebar-repeat").bind("repeat-please", function(){
                        // Workflows.selected.data('');


                        node = currentNodeType();
                        Workflows.controller.init(node);
                        Workflows.controller.populate();
                        Workflows.fit();
                    });

                    cy.$(':selected').unselect();
                    cy.on('select', function (e) {
                        Workflows.select2(e.target);
                    });
                    cy.on('unselect', Workflows.cancelState);
                    cy.$('#node-' + currentNode).select();



                } else {
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


