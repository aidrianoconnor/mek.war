class Game {

    static phases = {
        GAMESETUP   : 'gameSetup',
        TEAMSETUP   : 'teamSetup',
        PLAYING     : 'playing',
        FINISHED    : 'finished',

        MAPBUILDER  : 'mapBuilder'
    }

    static subphases = {
        NONE        : 'none',
        EDITUNIT    : 'editUnit',
        PLACEUNITS  : 'placeUnits',
        GAMEON      : 'gameOn'
    }

    static actionPhases = {
        NONE        : 'none',
        MOVE        : 'move',
        ATTACK      : 'attack'
    }

    static MAXTEAMS = 4;
    static MAXUNITS = 12;

    constructor() {
        this.teams = [];
        this.maxTons = 0;

        this.phase = Game.phases.GAMESETUP;
        this.subphase = Game.subphases.NONE;
        this.actionPhase = Game.actionPhases.NONE;

        this.currentTeam = 0; // index of currently active team
    }

    addTeam(name) {
        this.teams.push(new Team(name));
    }

    getCurrentTeamObj() {
        return this.teams[this.currentTeam];
    }

    getCurrentUnit() {
        return this.getCurrentTeamObj().currentUnit;
    }

    setCurrentUnit(index) {
        this.teams[this.currentTeam].currentUnit = index;
    }

    getCurrentUnitObj() {
        return this.getCurrentTeamObj().units[this.getCurrentUnit()];
    }



    /* UNIT PLACEMENT PHASE */
    
    placeNextUnit() {
        // placed units are stored in the app.maps.units MapList as UnitHex objects as .unit property
        
        const curTeam = this.getCurrentTeamObj();
        const unitMap = app.maps.units.list;
        //let t = 0;
        //const tlen = this.teams.length;
        let u = 0; 
        const ulen = curTeam.units.length;
        let um = 0;
        const umlen = unitMap.length;

        // scroll through the current team's unit, checking each to see if a matching unit exists in the maps.units.list
        let unitPlaced = false;
        for(u; u < ulen; u++) {
            unitPlaced = false;
            for(um = 0; um < umlen; um++) {
                if( unitMap[um].unit.id == curTeam.units[u].id) unitPlaced = true;
            }
            if(!unitPlaced) { // when first unplaced unit is found, make it the Game currentUnit
                this.setCurrentUnit(u);
                return;
            }
        }
        // if the end of the team units list is reached and none were found, make the next team the Game currentTeam and set currentUnit to 0
        if(unitPlaced) {
            //console.log('all units on team have been placed');
            if(this.currentTeam == this.teams.length - 1) {
                // if the end of all teams units lists are reached and none where found, change the Game subphase to GAMEPLAY
                //console.log('all teams units have been placed, change game subphase');
                app.startPlayingPhase();

            } else {
                this.currentTeam++;
                this.setCurrentUnit(0);
                const hexInRange = app.maps.unitPlacementMaps[this.currentTeam].list;
                for(let n in hexInRange) hexInRange[n] = new Highlight(hexInRange[n].r, hexInRange[n].c, app.maps, false);
                app.maps.highlights.setList(hexInRange);
                app.maps.paths.applyTeamLOS();
            }
        }
        
    }

}