class Hex {

    // mpas is app.maps - must be passed in bc of race conditions on when this constructor gets fired (app.maps may not yet exist)
    constructor(r, c, maps, type) {
        this.type = type;
        this.desc = 'Hex';
        this.r,
        this.c, 
        this.id,
        this.x,
        this.y,
        this.cx,
        this.cy;
        // sets the above empty values
        this.setPosition(r, c, maps);
    }

    // establishes coords (r and c), display x & y, center point display x & y
    // it also gets updated as it stores coords
    setPosition(r, c, maps) {
        const uWidth = maps.mapUnitWidth;
        const uHeight = maps.mapUnitHeight;
        this.r = r;
        this.c = c;

        this.id = r+','+c;

        this.x = Math.round(c * (uWidth * .75));
        if (c % 2 == 0) {
            this.y = Math.round(r * uHeight);
        } else {
            this.y = Math.round((r * uHeight) + (uHeight * .5));
        }
        this.cx = Math.round(this.x + (uWidth * .5)); // center x
        this.cy = Math.round(this.y + (uHeight * .5)); // center y
    }

    draw() {
        return this.drawFC('#933');
    }

    drawFC(fillColor) {
        const canvas = $('<canvas width="' + app.maps.mapUnitWidth + 'px" height="' + app.maps.mapUnitHeight + 'px" class="hex">');
        const ctx = canvas[0].getContext('2d');
        const x = app.maps.mapUnitWidth * .5; // center of canvas
        const y = app.maps.mapUnitHeight * .5; // center of canvas
        const a = 2 * Math.PI * .1666667;
        const r = app.maps.scaleUnit * .5; // radius of hex
        ctx.beginPath();
        ctx.strokeStyle = '#333'
        ctx.lineWidth = 1; //app.maps.scaleUnit * .05;
        ctx.fillStyle = fillColor;
        for (var i = 0; i < 6; i++) ctx.lineTo(x + r * Math.cos(a * i), y + r * Math.sin(a * i));
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        return canvas;
    }

    drawCircle() {
        const canvas = $('<canvas width="' + (app.maps.mapUnitWidth * .5) + 'px" height="' + (app.maps.mapUnitHeight * .6) + 'px" class="circle">');
        const ctx = canvas[0].getContext('2d');
        const x = app.maps.mapUnitWidth * .25; // center of canvas
        const y = app.maps.mapUnitHeight * .3; // center of canvas
        const r = app.maps.scaleUnit * .25; // radius of circle
        ctx.beginPath();
        ctx.arc(x, y, r, 2*Math.PI, false);
        ctx.closePath();
        ctx.fillStyle = '#900';
        ctx.fill();
        return canvas;
    }

    drawHotSpot() {
        if(!App.showHotspotLabels) {
            return $('<canvas width="' + (app.maps.mapUnitWidth * .5) + 'px" height="' +
                (app.maps.mapUnitHeight * .6) + 'px" class="hotspot" data-rel="' + this.r + ',' + this.c + '"></canvas>');
        } else {
            return $('<div width="' + (app.maps.mapUnitWidth * .5) + 'px" height="' +
                (app.maps.mapUnitHeight * .6) + 'px" class="hotspot" data-rel="' + this.r + ',' + this.c + '">' + 
                this.r + ',' + this.c + '<br/>' + this.moveCost.toString() + '</div>');
        }
    }
}

class Highlight extends Hex {

    constructor(r, c, maps, noFill = false) { 

        super(r, c, maps, Hexes.hexTypes.BASE);
        this.desc = 'Highlight';
        this.noFill = noFill;
    }

    draw() {
        const canvas = $('<canvas width="' + app.maps.mapUnitWidth + 'px" height="' + app.maps.mapUnitHeight + 'px" class="hex highlight">');
        const ctx = canvas[0].getContext('2d');
        const x = app.maps.mapUnitWidth * .5; // center of canvas
        const y = app.maps.mapUnitHeight * .5; // center of canvas
        const a = 2 * Math.PI * .1666667;
        const r = (app.maps.scaleUnit * .5) - 2; // radius of hex
        ctx.beginPath();
        
        for (var i = 0; i < 6; i++) ctx.lineTo(x + r * Math.cos(a * i), y + r * Math.sin(a * i));
        ctx.closePath();
        if(!this.noFill) {
            ctx.fillStyle = 'rgba(255, 255, 255, .25)';
            ctx.fill();
        }
        ctx.strokeStyle = 'rgba(255, 255, 0, 1)';
        ctx.lineWidth = 2; //app.maps.scaleUnit * .05;
        ctx.stroke();
        return canvas;
    }
}

// slightly special case... wraps a Unit object in a Hex object to gain access to placement data and drawing functions
class UnitHex extends Hex {

    constructor(r, c, maps, unit) { 
        super(r, c, maps, Hexes.hexTypes.BASE);
        this.desc = 'Unit Hex';
        this.unit = unit;
        this.visible = true; // for Line of Sight... is this unithex visible to the current team's units
    }

    draw() {
        const canvas = this.unit.draw();
        return canvas;
    }
}

/*** TERRAIN TYPES ***/
/* terrain holds info about moveCost, which gets augmented by moveCost of Features */
/* terrain also holds info about blocking Line of Sight, which can also be set on Features */

class Terrain extends Hex {
    constructor(r, c, maps) {
        super(r, c, maps, Hexes.hexTypes.TERRAIN);
        this.desc = 'Unspecified Terrain';
        this.moveCost = [1, 1, 1];
        this.blocksLOS = 0; // by default hexes do not block line of sight.  specific types will override this.
        this.cover = 0; // by default hexes do not provide cover.  specific types will override this.
    }
}

    class Grass extends Terrain {
        constructor(r, c, maps) { 
            super(r, c, maps, Hexes.hexTypes.TERRAIN);
            this.desc = 'Grass';
        }
        draw() {
            const canvas = this.drawFC('olivedrab');
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.terrain.Grass);
            ctx.fillStyle = '#2f541d';
            ctx.fill(path);
            return canvas;
        }
    }

    class LightForest extends Terrain {
        constructor(r, c, maps) { 
            super(r, c, maps, Hexes.hexTypes.TERRAIN);

            this.desc = 'Light Forest';
            this.moveCost = [1.5, 1.25, 1];
            this.blocksLOS = .25;
            this.cover = .1;
        }
        draw() {
            const canvas = this.drawFC('#5b801e'); // 'olive'
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.terrain.LightForest);
            ctx.scale(.1, .1);
            ctx.fillStyle = '#004622'; // darkolivegreen';
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }

    class ThickForest extends Terrain {
        constructor(r, c, maps) { 
            super(r, c, maps, Hexes.hexTypes.TERRAIN);

            this.desc = 'Thick Forest';
            this.moveCost = [App.INF, 2, 1.5];
            this.blocksLOS = .5;
            this.cover = .2;
        }
        draw() {
            const canvas = this.drawFC('#466e17'); // 'olive'
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.terrain.ThickForest);
            ctx.scale(.1, .1);
            ctx.fillStyle = '#004622'; // darkolivegreen';
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }

    class ShallowWater extends Terrain {
        constructor(r, c, maps) { 
            super(r, c, maps, Hexes.hexTypes.TERRAIN);
            this.desc = 'Shallow Water';
            this.moveCost = [App.INF, App.INF, 1];
        }
        draw() {
            const canvas = this.drawFC('steelblue');
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.terrain.Water);
            ctx.strokeStyle = 'skyblue'; //#23415a'; 
            ctx.stroke(path);
            return canvas;
        }
    }

    class DeepWater extends Terrain {
        constructor(r, c, maps) { 
            super(r, c, maps, Hexes.hexTypes.TERRAIN);
            this.desc = 'Deep Water';
            this.moveCost = [App.INF, App.INF, 2];
            this.cover = .3;
        }
        draw() {
            const canvas = this.drawFC('#315b7e');
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.terrain.Water);
            ctx.strokeStyle = 'skyblue'; //#23415a'; 
            ctx.stroke(path);
            return canvas;
        }
    }

    class Pavement extends Terrain {
        constructor(r, c, maps) { 
            super(r, c, maps, Hexes.hexTypes.TERRAIN);
            this.desc = 'Pavement';
            this.moveCost = [.75, .8, 1];
        }
        draw() {
            return this.drawFC('grey');
        }
    }

    class RoughGround extends Terrain {
        constructor(r, c, maps) { 
            super(r, c, maps, Hexes.hexTypes.TERRAIN);
            this.desc = 'Rough Ground';
            this.moveCost = [1.5, 1.25, 1];
        }
        draw() {
            const canvas = this.drawFC('#666100');
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.terrain.RoughGround);
            ctx.scale(.1, .1);
            ctx.translate(0, -50);
            ctx.fillStyle = 'lightgray';
            ctx.fill(path);
            ctx.stroke(path);

            return canvas;
        }
    }

    class VeryRoughGround extends Terrain {
        constructor(r, c, maps) { 
            super(r, c, maps, Hexes.hexTypes.TERRAIN);
            this.desc = 'Very Rough Ground';
            this.moveCost = [App.INF, 1.5, 1.25];
        }
        draw() {
            const canvas = this.drawFC('#665200');
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.terrain.VeryRoughGround);
            ctx.scale(.1, .1);
            ctx.translate(0, -50);
            ctx.fillStyle = 'lightgray';
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }



/*** FEATURES ***/
/* features hold info about blocking Line of Sight. this can also be set at the Terrain level */
/* feature moveCost augments moveCost of Terrain below it */
/* features' blocksLOS is a percentage (ie, .5) that gets added up hex-by-hex along the line of sight */

class Feature extends Hex {
    constructor(r, c, maps, rotate=0) {
        super(r, c, maps, Hexes.hexTypes.FEATURE);
        this.desc = 'Unspecified Feature';
        this.rotate = rotate; // degrees of rotation, applied via css
        this.moveCost = [0, 0, 0];
        this.blocksLOS = 0; // by default hexes do not block line of sight.  specific types will override this. 
    }
}

    class Wall extends Feature {
        constructor(r, c, maps, rotate=0) { 
            super(r, c, maps, Hexes.hexTypes.FEATURE, rotate);
            this.desc = 'Wall';
            this.rotate = rotate; // degrees of rotation, applied via css
            this.moveCost = [App.INF, App.INF, App.INF];
            this.blocksLOS = 1; // by default hexes do not block line of sight.  specific types will override this. this is a number as percent ie .5 = 50% blocked
            this.cover = 0; // by default features do not provide cover.  specific types will override this.
        }
        draw() {
            const canvas = $('<canvas width="' + app.maps.mapUnitWidth + 'px" height="' + app.maps.mapUnitHeight + 'px" class="feature">');
            const ctx = canvas[0].getContext('2d');
            const x = (app.maps.mapUnitWidth * .5) - 5;
            ctx.fillStyle = '#49535e';
            ctx.fillRect(x, 0, 10, app.maps.mapUnitHeight);
            return canvas;
        }
    }

    class WallCorner60 extends Feature {
        constructor(r, c, maps, rotate=0) { 
            super(r, c, maps, Hexes.hexTypes.FEATURE, rotate);
            this.desc = 'Wall Corner - 60deg';
            this.rotate = rotate; // degrees of rotation, applied via css
            this.moveCost = [App.INF, App.INF, App.INF];
            this.blocksLOS = 1; 
            this.cover = 0; 
        }
        draw() {
            const canvas = $('<canvas width="' + app.maps.mapUnitWidth + 'px" height="' + app.maps.mapUnitHeight + 'px" class="feature">');
            const ctx = canvas[0].getContext('2d');
            ctx.fillStyle = '#49535e';
            ctx.beginPath();
            ctx.moveTo(3.8,28);
            ctx.lineTo(30,12.8);
            ctx.lineTo(30,43.2);
            ctx.lineTo(20,43.2);
            ctx.lineTo(20,30.2);
            ctx.lineTo(8.8,36.7);
            ctx.closePath();
            ctx.fill();
            return canvas;
        }
    }

    class WallCorner120 extends Feature {
        constructor(r, c, maps, rotate=0) { 
            super(r, c, maps, Hexes.hexTypes.FEATURE, rotate);
            this.desc = 'Wall Corner - 120deg';
            this.rotate = rotate; // degrees of rotation, applied via css
            this.moveCost = [App.INF, App.INF, App.INF];
            this.blocksLOS = 1; 
            this.cover = 0; 
        }
        draw() {
            const canvas = $('<canvas width="' + app.maps.mapUnitWidth + 'px" height="' + app.maps.mapUnitHeight + 'px" class="feature">');
            const ctx = canvas[0].getContext('2d');
            ctx.fillStyle = '#49535e';
            ctx.beginPath();
            ctx.moveTo(20, 43.2);
            ctx.lineTo(20, 18.6);
            ctx.lineTo(41.2, 6.3);
            ctx.lineTo(46.2, 15);
            ctx.lineTo(30, 24.4);
            ctx.lineTo(30, 43.2);
            ctx.closePath();
            ctx.fill();
            return canvas;
        }
    }


class Hexes {

    // modes for Map Builder
    static MBmodes = {
        'TERRAIN'       : 'terrain',
        'PLACEMENT'     : 'placement',
        'FEATURE'       : 'feature'
    }

    // hexTypes currently just used in Map Builder to build lists of terrain vs feature and not list base types (hex, highlight, unitHex)
    static hexTypes = {
        'BASE'          : 'base',
        'TERRAIN'       : 'terrain',
        'FEATURE'       : 'feature'
    }

    static factory = {
        'Hex'           : function(r, c) { return new Hex(r, c, app.maps) },
        'Highlight'     : function(r, c, noFill = false) { return new Highlight(r, c, app.maps, noFill) },
        'UnitHex'       : function(r, c, unit = null) { return new UnitHex(r, c, app.maps, unit) },

        'Grass'             : function(r, c) { return new Grass(r, c, app.maps) },
        'LightForest'       : function(r, c) { return new LightForest(r, c, app.maps) },
        'ThickForest'       : function(r, c) { return new ThickForest(r, c, app.maps) },
        'ShallowWater'      : function(r, c) { return new ShallowWater(r, c, app.maps) },
        'DeepWater'         : function(r, c) { return new DeepWater(r, c, app.maps) },
        'Pavement'          : function(r, c) { return new Pavement(r, c, app.maps) },
        'RoughGround'       : function(r, c) { return new RoughGround(r, c, app.maps) },
        'VeryRoughGround'   : function(r, c) { return new VeryRoughGround(r, c, app.maps) },

        'Wall'             : function(r, c, rotate) { return new Wall(r, c, app.maps, rotate) },
        'WallCorner60'     : function(r, c, rotate) { return new WallCorner60(r, c, app.maps, rotate) },
        'WallCorner120'     : function(r, c, rotate) { return new WallCorner120(r, c, app.maps, rotate) },

    };

    constructor() {
        // these properties used in the Map Builder
        this.MBcurMode = Hexes.MBmodes.TERRAIN;
        this.MBcurHex = null;
        this.MBcurTerrainType = 'Grass';
        this.MBcurFeatureType = 'Wall';
        this.MBcurFeatureIndex = 0; // index in the maps.features MapList of the last Feature added to map
        this.MBcurTeam = 0;
    }

}