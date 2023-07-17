
// single dimensional lists to store additional features on top of Maps (highlights, units, buildings, etc)
// note the items stored can be of various classes and each class must have a .draw() method defined
class MapList {
    constructor(name) {
        this.list = [];
        this.name = name;
    }

    clear() {
        this.list = [];
    }

    setList(ar) {
        this.list = ar; // assumes the passed in array contains highlights / whatever object type already
    }

    addItem(item) {
        this.list.push(item);
    }

    removeItem(index) {
        this.list.splice(index, 1);
    }

    getItemByCoords(r, c) {
        var i=0, ilen = this.list.length;
        for(i; i<ilen; i++) if(this.list[i].r == r && this.list[i].c == c) return { obj: this.list[i], index: i };
        return false;
    }

    getItemByCoordStr(rc) {
        rc = rc.split(',');
        return this.getItemByCoords(parseInt(rc[0]), parseInt(rc[1]));
    }

    getUnitByID(id) { // specific to units MapList
        var i=0, ilen = this.list.length;
        for(i; i<ilen; i++) if(this.list[i].unit.id == id) {
            return { obj: this.list[i], index: i };
        }
        return false;
    }
    

    draw() {
        if(!this.list.length) { // if nothing to show just return an empty invisible div
            return $('<div style="width:0px; height:0px; display: none" class="map-layer ' + this.name + '">');
        }

        const mapLayer = $('<div style="width:' + (app.maps.mapUnitWidth * app.maps.mapRows) + 
            'px; height:' + (app.maps.mapUnitHeight * app.maps.mapCols) +'px;" class="map-layer ' + this.name + '">');
        
        var i, ilen, item, itemUI;
        for(i=0, ilen=this.list.length; i < ilen; i++) {
            item = this.list[i];
            //console.log('is this units?', (this.name == 'units'), item); 
            if(this.name != 'units' || (this.name == 'units' && item.visible == true) ) { // special case for units - they must be visible or do not draw (line of sight)
                itemUI = item.draw();
                $(itemUI).css({
                    left: item.x,
                    top:  item.y
                });
                if(item.rotate) $(itemUI).css('rotate', item.rotate + 'deg');
                mapLayer.append(itemUI);
            }
        }

        return mapLayer;
    }
}

// full two-dimensional hex maps
class Map {
    constructor(name, maps) {
        var r, c, row;
        this.name = name;
        this.grid = [];
        // this will create a default grid of Grass objects based on default size set in Maps
        // typically this gets overwritten when a pre-defined map is loaded during Game Setup
        for(r=0; r < maps.mapRows; r++) {
            row = [];
            for(c=0; c < maps.mapCols; c++) {
                row.push(new Grass(r, c, maps));
            }
            this.grid.push(row);
        }
        //console.log(this.grid);

    }

    getHexByCoords(r, c) {
        return this.grid[r][c];
    }

    getHexByCoordStr(rc) {
        rc = rc.split(',');
        return this.getHexByCoords(parseInt(rc[0]), parseInt(rc[1]));
    }

    draw() {
        const mapLayer = $('<div style="width:' + (app.maps.mapUnitWidth * app.maps.mapRows) + 
            'px; height:' + (app.maps.mapUnitHeight * app.maps.mapCols) +'px;" class="map-layer ' + this.name + '">');
        //const ctx = canvas[0].getContext('2d');
        var r, c, rlen, clen, hex, hexUI, hotspotUI;
        for(r=0, rlen=app.maps.mapRows; r < rlen; r++) {
        //for(r=0, rlen=1; r < rlen; r++) {
            for(c=0, clen=app.maps.mapCols; c < clen; c++ ) {
                hex = this.grid[r][c];
                hexUI = hex.draw();
                $(hexUI).css({
                    left: hex.x,
                    top:  hex.y
                });
                mapLayer.append(hexUI);

                // circleUI = hex.drawCircle();
                // $(circleUI).css({
                //     left: hex.x + (app.maps.mapUnitWidth * .25),
                //     top:  hex.y + (app.maps.mapUnitHeight * .2)
                // });
                // mapLayer.append(circleUI);

                // hotspotUI = hex.drawHotSpot();
                // $(hotspotUI).css({
                //     left: hex.x + (app.maps.mapUnitWidth * .25),
                //     top:  hex.y + (app.maps.mapUnitHeight * .2)
                // });
                // mapLayer.append(hotspotUI);

            }
        }

        return mapLayer;
    }

    drawHotSpots() {
        const mapLayer = $('<div style="width:' + (app.maps.mapUnitWidth * app.maps.mapRows) + 
            'px; height:' + (app.maps.mapUnitHeight * app.maps.mapCols) +'px;" class="map-layer hotspots">');
        var r, c, rlen, clen, hex, hotspotUI;
        for(r=0, rlen=app.maps.mapRows; r < rlen; r++) {
            for(c=0, clen=app.maps.mapCols; c < clen; c++ ) {
                hex = this.grid[r][c];
                hotspotUI = hex.drawHotSpot();
                $(hotspotUI).css({
                    left: hex.x + (app.maps.mapUnitWidth * .25),
                    top:  hex.y + (app.maps.mapUnitHeight * .2)
                });
                mapLayer.append(hotspotUI);

            }
        }

        return mapLayer;
    }
}

class Maps {
    constructor() {
        this.hexes = new Hexes();

        this.zoomLevel = 1;
        this.scaleUnit = 50;
        this.mapUnitWidth = this.scaleUnit;
        this.mapUnitHeight = this.scaleUnit * .866;

        // these two get overwritten by loaded map data on save of Game Setup phase
        this.mapRows = 10;
        this.mapCols = 10;

        this.terrainMap = new Map('terrain', this);
        this.featureMap = new MapList('features');
        this.highlights = new MapList('highlights');

        // created per team.  stores placement / deployment locations for this team.
        // each item is a MapList containing Highlights in its .list property
        this.unitPlacementMaps = [];

        this.units = new MapList('units'); // single list storing all units for all teams
        
        this.paths = new Paths();

    }

    // adds a unit to the units mapList
    addMapUnit(r, c, unit) {
        this.units.addItem(new UnitHex(r, c, this, unit));
    }

    // find the current unit in the units MapList
    getCurrentMapUnit() {
        const unit = app.game.getCurrentUnitObj();
        let mu = 0;
        const mulen = app.maps.units.list.length;
        for(mu; mu < mulen; mu++) {
            if(this.units.list[mu].unit.id == unit.id) {
                return this.units.list[mu];
            }
        }
        return false;
    }

    // get the total move cost for a given hex (including terrain move cost, if occupied by unit, feature move cost modifiers, etc)
    getHexMoveCost(r, c, chassisType) {
        //console.log('getHexMoveCost', r, c, chassisType);
        if(this.units.getItemByCoords(r, c)) return App.INF; // if hex is occupied no move possible

        let i = 0, out = [], feature, featureCost;
        feature = this.featureMap.getItemByCoords(r, c);
        // return to add in other move modifiers when those maps are added (features like buildings, heavy forest, etc)
        if(chassisType != 'ALL') {
            return this.terrainMap.getHexByCoords(r, c).moveCost[chassisType] + ((feature) ? feature.obj.moveCost[chassisType] : 0);
        } else {
            // ALL is a special value for chassisType indicating that the entire moveCost array of the hex should be returned
            const ilen = this.terrainMap.getHexByCoords(r, c).moveCost.length;
            for(i; i < ilen; i++) {
                out.push(this.terrainMap.getHexByCoords(r, c).moveCost[i] + ((feature) ? feature.obj.moveCost[i] : 0));
            }
            return out;
        }
        

    }

}