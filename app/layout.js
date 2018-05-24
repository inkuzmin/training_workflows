Workflows.Layout = {

    vertical: function(params) {
        var previousY = params.origY;
        return function(field) {
            switch (field) {
                default:
                    var coords = {
                        x: params.origX,
                        y: previousY + params.shiftY
                    };
                    previousY = coords.y;
                    // console.log(coords);
                    return {
                        position: coords
                    };
            }
        };
    },

    operation: function(params) {

        var operation = false;
        var inputs = [];
        var output = false;

        return function(field) {
            switch (field) {
                case "OperationOntologyTerm":
                    if (operation) {
                        throw new Error("there could be only one `operation` per node");
                    } else {
                        operation = true;
                    }

                    var y = params.origY + params.shiftY;

                    return {
                        position: {
                            x: params.origX,
                            y: y
                        },
                        width: inputs.length * params.inputWidth
                    };
                case "InputTypeOntologyTerm":
                    return {
                        position: {
                            x: params.origX + (inputs.length * params.inputWidth),
                            y: params.origY
                        },
                        width: params.inputWidth
                    };
                case "OutputTypeOntologyTerm":
                    if (output) {
                        throw new Error("there could be only one `output` per node");
                    } else {
                        output = true;
                    }

                    var y = params.origY + params.shiftY * 2;

                    return {
                        position: {
                            x: params.origX,
                            y: y
                        },
                        width: inputs.length * params.inputWidth
                    };

                default:
                    console.log("field " + field + " has been skipped!");
                    return null;
            }
        }
    }


};
