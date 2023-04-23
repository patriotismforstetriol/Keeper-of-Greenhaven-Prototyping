// Source of these calculations: scripts from:
// https://kcoley.github.io/glTF/extensions/2.0/Khronos/KHR_materials_pbrSpecularGlossiness/examples/convert-between-workflows/

// From three.colorExtensions.js
THREE.Color.prototype.clamp = function (min, max) {
    if (!min) min = 0;
    if (!max) max = 1;
    this.r = THREE.Math.clamp(this.r, min, max);
    this.g = THREE.Math.clamp(this.g, min, max);
    this.b = THREE.Math.clamp(this.b, min, max);
    return this;
}

THREE.Color.prototype.getPerceivedBrightness = function () {
    return Math.sqrt(0.299 * this.r * this.r + 0.587 * this.g * this.g + 0.114 * this.b * this.b);
}

THREE.Color.prototype.getMaxComponent = function() {
    return Math.max(this.r, this.g, this.b);
}


// From three.pbrUtilities.js
function getRoughnessofSpecularGlossinessMat(shininess) {
    return 1 - shininess;
}

function getMetallicofSpecularGlossinessMat(diffuseAvgBrightness, specularColour) {
    const dielectricSpecular = 0.04;

    //diffuseBrightness = diffuseColour.getPerceivedBrightness();
    specularBrightness = specularColour.getPerceivedBrightness();
    specularStrength = specularColour.getMaxComponent();

    if (specular < dielectricSpecular) {
        return 0;
    }

    var a = dielectricSpecular;
    var b = (diffuseAvgBrightness * (1 - specularStrength) / (1 - dielectricSpecular) +
        specularBrightness - 2 * dielectricSpecular);
    var c = dielectricSpecular - specularBrightness;
    var D = Math.max(b * b - 4 * a * c, 0);
    return THREE.Math.clamp((-b + Math.sqrt(D)) / (2 * a), 0, 1);
}


