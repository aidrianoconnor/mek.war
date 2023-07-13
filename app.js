
class App  {

    static webroot = 'http://localhost/mekwar/gitroot'; // http path to application root, used for loading data files 
    static INF = 999; // "infinity" for move calcs, ammo... ie, no possible move here, or weapon has infinite ammo

    constructor() {
        //this.classes = {};
        //this.classes.weapons = new Weapons();
        //this.classes.units = new Units();
        this.game = new Game();
        this.maps = new Maps();
        this.UI = new UI();
        this.data = { // holds loaded data for maps, etc, populated on save of Game Setup
            terrainMap: {},
            placementMaps: [],
            teamConfig: []
        };
    }

    // NOT: sometimes this "this" can be used in these functions, other times it must be "app" depending on context of function call

    startNewGame() {
        this.UI.update();
    }

    startTeamSelection() {
        app.game.phase = Game.phases.TEAMSETUP;
        app.UI.update();
    }

    loadGameData(mapFilename, teamConfigFilename, callback) {
        // load terrain map data
        $.ajax({
            url: App.webroot + '/data/terrainMaps/' + mapFilename + '.json',
            dataType: 'JSON',
            success: function(data) { 
                app.data.terrainMap = data; 
                // load unit placement map data
                $.ajax({
                    url: App.webroot + '/data/featureMaps/' + mapFilename + '.json',
                    dataType: 'JSON',
                    success: function(data) {
                        app.data.featureMap = data;
                        // load unit placement map data
                        $.ajax({
                            url: App.webroot + '/data/placementMaps/' + mapFilename + '.json',
                            dataType: 'JSON',
                            success: function(data) { 
                                app.data.placementMaps = data;
                                if(teamConfigFilename) {
                                    // load team config
                                    $.ajax({
                                        url: App.webroot + '/data/teamConfigs/' + teamConfigFilename + '.json',
                                        dataType: 'JSON',
                                        success: function(data) { 
                                            app.data.teamConfig = data;
                                            app.applyGameData();
                                            callback();
                                        }
                                    });
                                } else {
                                    app.applyGameData();
                                    callback();
                                } 
                            }
                        });
                        
                    }
                });
            }
        });
        
    }

    // takes the data for maps, etc, that has been loaded into app.data and converts it into usable classes for display of the game board
    applyGameData() {
        app.maps.mapRows = app.data.terrainMap.mapRows;
        app.maps.mapCols = app.data.terrainMap.mapCols;
        app.maps.terrainMap.grid = [];
        let r, c, i, x, hl;
        for(r=0; r < app.data.terrainMap.grid.length; r++) {
            app.maps.terrainMap.grid.push([]);
            for(c=0; c < app.data.terrainMap.grid[r].length; c++) {
                app.maps.terrainMap.grid[r].push(Hexes.factory[app.data.terrainMap.grid[r][c]](r, c));
            }
        }
        for(i=0; i < app.data.featureMap.length; i++) {
            hl = Hexes.factory[app.data.featureMap[i].type](app.data.featureMap[i].r, app.data.featureMap[i].c, app.data.featureMap[i].rotate)
            app.maps.featureMap.addItem(hl);
        }
        for(i in app.data.placementMaps) {
            app.maps.unitPlacementMaps.push(new MapList());
            for(x in app.data.placementMaps[i]) {
                hl = new Highlight(app.data.placementMaps[i][x].r, app.data.placementMaps[i][x].c, app.maps, false);
                app.maps.unitPlacementMaps[i].addItem(hl);
            }
        }
        if(app.data.teamConfig.length) {
            //console.log(app.data.teamConfig);
            for(i=0; i < this.game.teams.length; i++) {
                this.game.teams[i].units = [];
                for(x=0; x < app.data.teamConfig.length; x++) {
                    let unit = app.data.teamConfig[x];
                    let weapons = [];
                    for(let r in unit.weapons) {
                        weapons.push(Weapons.factory[unit.weapons[r]]());
                    }
                    unit = new Unit(i, Units.chassisFactory[unit.chassis](), Units.reactorFactory[unit.reactor](), unit.armor, weapons);
                    this.game.teams[i].addUnit(unit);
                }
            };
            //console.log(this.teams);
        }

        // release loaded data from memory
        //delete app.data;
    }

    startPlacementPhase() {
        app.game.phase = Game.phases.PLAYING;
        app.game.subphase = Game.subphases.PLACEUNITS;
        app.game.currentTeam = 0;
        app.game.setCurrentUnit(0);
        app.maps.highlights.setList(app.maps.unitPlacementMaps[app.game.currentTeam].list);
        app.UI.update();
    }

    startPlayingPhase() {
        app.game.phase = Game.phases.PLAYING;
        app.game.subphase = Game.subphases.GAMEON;
        app.game.actionPhase = Game.actionPhases.MOVE;
        app.maps.highlights.clear();
        app.game.currentTeam = -1; // start new turn increments this to Team 0

        this.startNewTurn();
    }

    startNewTurn() {
        //if(app.maps.unitPlacementMaps) delete app.maps.unitPlacementMaps; // release unit placement maps from memory
        app.game.currentTeam++;
        if(app.game.currentTeam >= app.game.teams.length) app.game.currentTeam = 0;
        app.game.setCurrentUnit(0);
        app.game.getCurrentTeamObj().resetActionPoints();
        this.startMoveActionPhase();
    }

    startMoveActionPhase() {
        app.game.actionPhase = Game.actionPhases.MOVE;
        const unit = app.game.getCurrentUnitObj();
        const mapunit = app.maps.getCurrentMapUnit();

        app.maps.paths.applyTeamLOS();

        if(mapunit) { // mapunit can be MIA if this unit destroyed
            const hexInRange = app.maps.paths.findWithinRange(mapunit, unit.movePoints, 0, Units.moveCosts[unit.chassis.constructor.name]);
            for(let n in hexInRange) hexInRange[n] = new Highlight(hexInRange[n].r, hexInRange[n].c, app.maps, false);
            app.maps.highlights.setList(hexInRange);
        }
        app.UI.update();
    }

    startAttackActionPhase() {
        app.game.actionPhase = Game.actionPhases.ATTACK;
        const curUnit = app.game.getCurrentUnitObj()
        const weapon = curUnit.weapons[curUnit.currentWeapon];
        //console.log('weapon', weapon);
        const mapunit = app.maps.getCurrentMapUnit();
        if(!weapon.fired) { // not sure this is needed here
            /* 
            this need to be updated to be move complex
            currently just finds all hexes in range and adds a clickable highlight when visible enemy units occupy a hex within the set
            instead needs to see if this weapon requires LOS and then check to see if the attacker has LOS to the target
            also would be nice to have a filtering function to enforce minimum weapon range on the original range set
            */
            const hexInRange = app.maps.paths.findWithinRange(mapunit, weapon.range, weapon.minrange, false);
            for(let n in hexInRange) {
                let noFill = true; // for weapon range finding, show only outlines for unoccupied squares, filled highlight for occupied
                let targUnit = app.maps.units.getItemByCoords(hexInRange[n].r, hexInRange[n].c);
                if(targUnit && targUnit.obj.team != curUnit.team) noFill = false;
                hexInRange[n] = new Highlight(hexInRange[n].r, hexInRange[n].c, app.maps, noFill);
            }
            app.maps.highlights.setList(hexInRange);
        } else {
            app.maps.highlights.clear();
        }
        app.UI.update();
        
        //console.log(curUnit.weapons[]);
    }

    loadMapBuilder() {
        app.game.phase = Game.phases.MAPBUILDER;
        this.UI.update();
    }


    


    

    // TEMP - FOR LOS TESTING - fire via JS console app.lostest[1,1,9,9]
    lostest(r1, c1, r2, c2) {
        
        const hex1 = app.maps.terrainMap.grid[r1][c1];
        const hex2 = app.maps.terrainMap.grid[r2][c2];
        
        const canvas = $('<canvas width="2000px" height="2000px" style="position: absolute; top: 0; left: 0" id="LOStest">');
        const ctx = canvas[0].getContext('2d');
        ctx.beginPath();
        ctx.strokeStyle = 'red'
        ctx.lineWidth = 1; //app.maps.scaleUnit * .05;
        ctx.moveTo(hex1.cx, hex1.cy);
        ctx.lineTo(hex2.cx, hex2.cy);
        ctx.closePath();
        ctx.stroke();

        $('#mapDrag').append(canvas);

        //console.log(hex1.cx +','+ hex1.cy, hex2.cx+','+hex2.cy)

        // inital point just establishes line length for follow-on calculations
        let point = app.maps.paths.getPointAlongLine(hex1.cx, hex1.cy, hex2.cx, hex2.cy, 0);
        //console.log('point', point);

        let step = (app.maps.scaleUnit * .5); // distance along line that points should be plotted to test for intersection with hexes
        let pointCnt = point.length / step;
        //console.log('pointCnt', pointCnt);

        let r, c, hex;
        const grid = app.maps.terrainMap.grid;
        const rlen = grid.length;
        const clen = grid[0].length;

        const hexRadius = app.maps.scaleUnit * .5; // equates to center point to vertex (ie, circumsphere)
        const pointRadius = .5; // our testing points along the line are 1px wide

        const returnList = [];

        // this determines point coordinates along the path between the start hex and the end hex
        // then it figures out what hexes those points touch, and returns the list of all touched hexes' r,c coords
        // note that the radius assumed for hexes is a 'circumsphere' so there is intentional overlap of hex circles near edges
        // in edge cases this might result in blocked LOS when it seems like it should not be blocked, but thems the breaks - call it too close to call

        for(var i = 1; i <= pointCnt; i++) {
            point = app.maps.paths.getPointAlongLine(hex1.cx, hex1.cy, hex2.cx, hex2.cy, i * step);

            // CURRENTLY CHECKING AGAINST ALL HEXES IN TERRAIN MAP!  REDUCE THE SEARCH SET!
            
            for(r=0; r < rlen; r++) {

                for(c=0; c < clen; c++) {
                    if(!returnList.find(el => el.r == r && el.c == c)) { // dont reparse if hex already in returnList
                        hex = grid[r][c];

                        let distX = point.x - hex.cx;
                        let distY = point.y - hex.cy;
                        let distance = Math.sqrt( (distX*distX) + (distY*distY) );

                        if (distance <= pointRadius + hexRadius) { // pointRadius is radius of our dots along the path, hexRadius is the radius of a map hexagon
                            //for now drawing the hex circle, but should add hex to output array
                            ctx.beginPath();
                            ctx.arc(hex.cx, hex.cy, hexRadius, 2*Math.PI, false);
                            ctx.closePath();
                            ctx.strokeStyle = 'orange';
                            ctx.stroke();

                            returnList.push({r: r, c: c});
                        }
                    }
                }

            }


        }

        return returnList;
    }

    clearLOS() {
        $('#LOStest').remove();
    }
}

var app;
document.addEventListener('DOMContentLoaded', function() {
    app = new App();
    //console.log(app);
    app.startNewGame();
    console.log(app);
});
