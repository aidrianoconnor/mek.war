
class UI {

    constructor() {
        this.main = $('#main');
        this.tooltip;
    }

    clearUI() {
        this.main.html('');
        this.main.remove();
        delete this.main;

        $('body').prepend('<div id="main" />');
        this.main = $('#main');
    }

    // redraws UI based on current state
    update() {
        this.clearUI();
        switch(app.game.phase) {
            case Game.phases.GAMESETUP :
                this.drawGameSetup();
                break;
            case Game.phases.TEAMSETUP :
                this.drawTeamSelection();
                break;
            case Game.phases.PLAYING :
                this.drawGameBoard();
                break;

            case Game.phases.FINISHED :
                break;

            case Game.phases.MAPBUILDER :
                this.drawMapBuilder();
                break;
        }
    }


    /* GENERIC UI HELPERS */

    getCoordsFromStr(str) {
        var coords = str.split(',');
        return { r: parseInt(coords[0]), c: parseInt(coords[1]) }
    }

    drawUnitDetails(unit, showAdminLinks, showActionLinks) {
        var out, pane, table, unit, weapon;
        var pane = $('<div class="pane unit">');
        pane.append('<h3 data-rel="' + unit.id + '">' + unit.getName() + '</h3>');

        if(showAdminLinks) {
            out = '<p><a href="' + unit.id + '" class="teamSetupEditUnit">edit</a>';
            if(app.game.getCurrentTeamObj().units.length > 1) out += ' | <a href="' + unit.id + '" class="teamSetupRemoveUnit">remove</a>';
            out += '</p>';
            pane.append(out);
        }

        pane.append('<p>Total Weight: ' + unit.getWeight() + ' tons</p>');
        pane.append('<p>Armor: ' + unit.armor + ' tons</p>');
        pane.append('<p>Health Points: ' + unit.healthPoints + '</p>'); 
        pane.append('<p>Speed: ' + unit.getSpeed() + '</p>');

        table = $('<table class="pane weapon">');
        table.append('<thead><tr>' +
            '<td>Name</td>' +
            '<td class="center attack">Range</td>' +
            '<td class="center">Type</td>' +
            '<td class="center">Dmg</td>' +
            '<td class="center">Rounds</td>' +
            '<td class="center attack">Ammo</td>' +
            '<td class="center">To Hit</td>' +
            '<td class="center attack">AP</td>' +
            '<td class="center">Weight</td>' +
            '<td class="center attack">&nbsp;</td>' +
            '</tr></thead>'
        );

        for(var i in unit.weapons) {
            weapon = unit.weapons[i];
            out = '<tr>' +
                '<td>' + weapon.name + '</td>' +
                '<td class="center attack">' + weapon.range + '</td>' +
                '<td class="center">' + weapon.cat + '</td>' +
                '<td class="center">' + weapon.dmg + '</td>' +
                '<td class="center">' + weapon.rounds + '</td>' +
                '<td class="center attack">' + ((weapon.ammo != App.INF) ? weapon.ammo : 'N/A')+ '</td>' +
                '<td class="center">' + weapon.toHit  + '</td>' +
                '<td class="center attack">' + weapon.fireCost  + '</td>' +
                '<td class="center">' + weapon.weight + '</td>' +
                '<td class="center attack">';
                if(!weapon.fired && weapon.fireCost <= unit.attackPoints) out +='<a href="' + i + '" class="fireLink">FIRE</a>';
                out +='&nbsp;</td>' +
                    '</tr>';

            table.append(out);
        };

        pane.append('<p>Weapons:</p>');
        if(unit.weapons.length == 0) {
            pane.append('<em>- NONE -<em>');
        } else {
            pane.append(table);
        }

        pane.append('<p><a href="' + unit.id + '" class="teamSetupUnitConfig">Output Unit Config</a></p>');

        if(showActionLinks && app.game.subphase == Game.subphases.GAMEON) {
            out = '<p class="actionLinks"><a href="#" id="actionMove"';
            if(app.game.actionPhase == Game.actionPhases.MOVE) out += ' class="selected"';
            out += '>MOVE</a></p>';

            out += '<p><a href="#" id="convertMPtoAP">Convert MP to AP</a</p>';
            
            pane.append(out);

        } else {

        }

        out = '<p>Move Points: ' + ((unit.movePoints) ? unit.movePoints : '<span class="error">' + unit.movePoints + '</span>') + 
        ' | Attack Points: ' + ((unit.attackPoints) ? unit.attackPoints : '<span class="error">' + unit.attackPoints + '</span>') + '</p>';

        pane.append(out);

        return pane;
    }

    showTooltip(e, coordsStr) {
        let leftOffset = 0;
        let topOffset = 0;
        const coords = app.UI.getCoordsFromStr(coordsStr);
        let out = coordsStr; // coords

        // get terrain details
        const moveCost = app.maps.getHexMoveCost(coords.r, coords.c, 'ALL');
        const terrain = app.maps.terrainMap.getHexByCoords(coords.r, coords.c);
        out += '<br/>' + terrain.desc + ' - ' + moveCost.toString() +
            '<br/>' + (100 - (terrain.blocksLOS * 100)) + ' LOS';

        // get feature details
        const feature = app.maps.featureMap.getItemByCoords(coords.r, coords.c);
        if(feature) out += '<br/>' + feature.obj.desc + ' - ' + (100 - (feature.obj.blocksLOS * 100)) + '% LOS';

        // get unit details
        const unit = app.maps.units.getItemByCoords(coords.r, coords.c);
        if(unit) out += '<br/>' + unit.obj.unit.getName();

        app.UI.tooltip.html(out);
        app.UI.tooltip.show();

        if(e.originalEvent.clientX < app.UI.tooltip.width() * .5) {
            leftOffset = app.UI.tooltip.width() * .5;
        } else if (e.originalEvent.clientX > ($(window).width() - app.UI.tooltip.width() * .5)) {
            leftOffset = -(app.UI.tooltip.width() * .5);
        }
        if(e.originalEvent.clientY < app.UI.tooltip.height() + 40) {
            topOffset = app.UI.tooltip.height() + 80;
        }

        app.UI.tooltip.css({
            left: (e.originalEvent.clientX - (app.UI.tooltip.width() / 2) + leftOffset) + 'px',
            top: (e.originalEvent.clientY - app.UI.tooltip.height() - 40 + topOffset) + 'px'
        });
    }


    /* GAME SETUP */

    drawGameSetup() {
        var pane = $('<div class="pane">');

        var table = $('<table class="pane" id="gameSetupPane">');

        table.append('<tr>' +
            '<td>Number of Players</td>' +
            '<td><input type="number" id="gameNumPlayers" value="2" /></td>' +
            '</tr>' +
            '<tr>' +
            '<td>Team Tonnage</td>' +
            '<td><input type="number" id="gameTeamTonnage" value="200"/></td>' +
            '</tr>'
        );

        pane.append('<h1>mek:war</h1>' +
            '<h2>Game Setup:</h2>');
       
        pane.append(table);

        // add a list of maps here with radios to select one
        // value of radio equates to filename of map file in data/terrainMaps folder which contains a JSON string of the map data outputted from the map builder
        // meta data in the json object indicates the mapRows and mapCols for app.maps (or is this necessary if you're not building the map grid from the class?)
        // same file name can be used to laod the associated placementMaps and featureMaps

        // potentially use the same approach to select pre-configured teams

        let out = '<h3>Select Map</h3>' +
            '<div class="pane">' +
            '<input type="radio" name="terrainMapFile" id="terrainMapFile01" value="map01" checked> <label for="terrainMapFile01">Map 01</label><br />' +
            '<input type="radio" name="terrainMapFile" id="terrainMapFile02" value="map02"> <label for="terrainMapFile02">Map 02</label><br />' +
            '</div>';
        
        pane.append(out);

        out = '<h3><input type="checkbox" id="useTeamConfig" /> Use Pre-Configured Teams</h3>' +
            '<div class="pane">' +
            '<input type="radio" name="teamConfigFile" id="teamConfigFile01" value="teamConfig01"> <label for="teamConfigFile01">Team Config 01</label><br />' +
            '<input type="radio" name="teamConfigFile" id="teamConfigFile02" value="teamConfig02"> <label for="teamConfigFile02">Team Config 02</label><br />' +
            '<input type="radio" name="teamConfigFile" id="teamConfigFile03" value="teamConfig03"> <label for="teamConfigFile03">Team Config 03</label><br />' +
            '</div>';

        pane.append(out);

        pane.append('<button id="saveGameSetup">Save</button>');
        pane.append('<button style="margin-left: 2em;" id="loadMapBuilder">Map Builder</button>');

        this.main.append(pane);

        this.wireGameSetup();

    }

    wireGameSetup() {
        $('#saveGameSetup').on('click', function(e){
            e.preventDefault();
            for(let i=1; i <= parseInt($('#gameNumPlayers').val()); i++) {
                app.game.addTeam('Player '+i);
            }
            app.game.maxTons = parseInt($('#gameTeamTonnage').val());
            
            // load the selected map data - terrain, placement, features (not yet implemented)
            if($('#useTeamConfig:checked').length) {
                app.loadGameData($('input[name="terrainMapFile"]:checked').val(), $('input[name="teamConfigFile"]:checked').val(), app.startPlacementPhase);
            } else {
                app.loadGameData($('input[name="terrainMapFile"]:checked').val(), false, app.startTeamSelection);
            }
        });

        $('#loadAutoConfig').on('click', function(e){
            e.preventDefault();
            app.loadAutoConfig();
        });

        $('#useTeamConfig').on('click', function(e){
            if($('#useTeamConfig:checked').length) {
                $('input[name="teamConfigFile"]')[0].click();
            } else {
                $('input[name="teamConfigFile"]').prop('checked', false);
            }
        });

        $('#loadMapBuilder').on('click', function(e){
            e.preventDefault();
            app.loadMapBuilder();
        });
    }


    /* TEAM SETUP */

    drawTeamSelection() {
        let pane, table, team;
        team = app.game.getCurrentTeamObj();

        pane = $('<div class="pane">');
        pane.append('<h1>mek:war</h1>');
        pane.append('<h2>' + team.name + ' Team Setup</h2>');

        table = $('<table class="pane" id="teamSetupPane">');

        table.append('<tr>' +
            '<td>Team Name</td>' +
            '<td><input type="text" id="teamSetupName" value="' + team.name + '" /></td>' +
            '</tr>' +
            '<tr>' +
            '<td>Tonnage Remaining</td>' +
            '<td class="right" id="teamTons">' + team.tonsRemaining() + '</td>' +
            '</tr>' +
            '<tr>' +
            '<td>Number of Units</td>' +
            '<td class="right">' + team.units.length + '</td>' +
            '</tr>' +
            '<tr>' +
            '<td><a href="#" id="teamSetupAddUnit">add unit</a></td>' +
            '<td class="right"><a href="#" id="teamSetupComplete">setup complete</a></td>' +
            '</tr>'
        );

        pane.append(table);

        pane.append('<p><a href="#" id="teamSetupTeamConfig">Output Team Config</a></p>');

        // indvidual unit details
        var row = $('<div class="row">');
        for(let i in team.units) {
            row.append(this.drawUnitDetails(team.units[i], true));
        }
        pane.append(row);

        if(app.game.subphase == Game.subphases.EDITUNIT && app.game.getCurrentTeamObj().units.length) pane.append(this.drawUnitBuilder());

        this.main.append(pane);

        if(app.game.subphase == Game.subphases.EDITUNIT && app.game.getCurrentTeamObj().units.length) this.wireUnitBuilder();

        this.wireTeamSelection();
    }

    wireTeamSelection() {
        $('#teamSetupName').on('change', function(){
            app.game.getCurrentTeamObj().name = $(this).val();
            app.UI.update();
        });

        $('#teamSetupAddUnit').on('click', function(e){
            e.preventDefault();
            app.game.getCurrentTeamObj().addNewUnit();
            app.UI.update();
        });

        $('#teamSetupComplete').on('click', function(e){
            e.preventDefault();
            if(app.game.getCurrentTeamObj().tonsRemaining() < 0) {
                $('#teamTons').addClass('error');
                alert('Your load out is too heavy for this game.  Remove units or equipment.');
                return false;
            } else {
                $('#teamTons').removeClass('error');
            }
            if(confirm('Are you sure you are done setting up this team?  You will not be able to alter it later.')) {
                if(app.game.currentTeam < app.game.teams.length-1) {
                    app.game.currentTeam++;
                    app.game.setCurrentUnit(0);
                    app.UI.update();
                } else {
                    //alert('starting game');
                    app.applyGameData();
                    app.startPlacementPhase();
                }
            }
        });

        $('.teamSetupEditUnit').on('click', function(e){
            e.preventDefault();
            app.game.setCurrentUnit(app.game.getCurrentTeamObj().getUnitIndexByID($(this).attr('href')));
            app.game.subphase = Game.subphases.EDITUNIT;
            app.UI.update();
        });

        $('.teamSetupRemoveUnit').on('click', function(e){
            e.preventDefault();
            if(confirm('Are you sure you want to remove this unit?')) {
                var index = app.game.getCurrentTeamObj().getUnitIndexByID($(this).attr('href'));
                app.game.getCurrentTeamObj().units.splice(index, 1);
                app.game.setCurrentUnit(false);
                app.game.subphase = Game.subphases.NONE;
                app.UI.update();
            }
        });

        $('.teamSetupUnitConfig').on('click', function(e){
            e.preventDefault();
            const unit = app.game.getCurrentTeamObj().getUnitByID($(this).attr('href'));
            let data = {
                chassis         : unit.chassis.constructor.name,
                reactor         : unit.reactor.constructor.name,
                armor           : unit.armor,
                weapons         : []
            }
            for(let w in unit.weapons) data.weapons.push(unit.weapons[w].constructor.name);
            // NOT A DEBUGGING LOG - DO NOT COMMENT OUT
            console.log(JSON.stringify(data));
        });

        $('#teamSetupTeamConfig').on('click', function(e){
            e.preventDefault();
            const team = app.game.getCurrentTeamObj();
            const data = [];
            for(let u in team.units) {
                let unitdata = {
                    chassis         : team.units[u].chassis.constructor.name,
                    reactor         : team.units[u].reactor.constructor.name,
                    armor           : team.units[u].armor,
                    weapons         : []
                }
                for(let w in team.units[u].weapons) unitdata.weapons.push(team.units[u].weapons[w].constructor.name);
                data.push(unitdata);
            }
            // NOT A DEBUGGING LOG - DO NOT COMMENT OUT
            console.log(JSON.stringify(data));

        });
    }

    drawUnitBuilder() {

        var unit = app.game.getCurrentUnitObj();
        //console.log(unit);

        var type, table, t, out;
        var pane = $('<div class="pane">');
        var row = $('<div class="row">');

        // reactor table
        table = $('<table class="pane" id="reactorPane">');
        table.append('<thead><tr><td>Reactor</td><td>Type</td><td>Power</td><td>Weight</td></tr></thead>');
        for (t in Units.reactorFactory) {
            type = Units.reactorFactory[t]();
            
            out = '<tr>' +
                '<td class="center"><input type="radio" id="' + t + '-' + unit.id + '" name="reactor" value="' + t + '"';
            if(t == unit.reactor.constructor.name) out += ' checked';
            out += '/></td>' +
                '<td><label for="' + t + '-' + unit.id + '">' + type.name + '</label></td>' +
                '<td class="center">' + type.power + '</td>' +
                '<td class="center">' + type.weight + '</td>' +
                '</tr>';

            table.append(out);

        }
        pane.append('<h2>Unit Builder</h2>');
        pane.append(row);
        row.append(table);

        // chassis table
        table = $('<table class="pane" id="chassisPane">');
        table.append('<thead><tr><td>Chassis</td><td>Type</td><td>Weight</td></tr></thead>');
        for (t in Units.chassisFactory) {
            type = Units.chassisFactory[t]();
            out = '<tr>' +
                '<td class="center"><input type="radio" id="' + t + '-' + unit.id + '" name="chassis" value="' + t + '"'
                if(t == unit.chassis.constructor.name) out += ' checked';
                out += '/></td>' +
                '<td><label for="' + t + '-' + unit.id + '">' + type.name + '</label></td>' +
                '<td class="center">' + type.weight + '</td>' +
                '</tr>';
            table.append(out);
        }
        row.append(table);

        // weapons table
        table = $('<table class="pane" id="weaponsPane">');
        table.append('<thead><tr><td>Weapons</td><td>Name</td><td>Weight</td></tr></thead>');
        for (t in Weapons.factory) {
            type = Weapons.factory[t]();            
            out = '<tr>' +
                '<td class="center"><input type="number" id="' + t + '-' + unit.id + '" ' +
                  'value="' + unit.getWeaponTypeCount(type.name) + '" name="weapon" data-rel="' + t + '"/></td>' +
                '<td><label for="' + t + '-' + unit.id + '">' + type.name + '</label></td>' +
                '<td class="center">' + type.weight + '</td>' +
                '</tr>';
            table.append(out);
        }
        row.append(table);

        table = $('<table class="pane" id="armorPane">');
        table.append('<thead><tr><td colspan="2">Armor</td></tr></thead>');
        out = '<tr><td><input type="number" name="armor" value="' + unit.armor + '" /></td>' +
            '<td>Tons of Armor</td></tr>';
        table.append(out);
        row.append(table);
        //pane.append('<button id="saveMechSetup">Save</button>')

        return pane;
    }

    wireUnitBuilder() {

        $('input[name=reactor]').on('click', function(){
            app.game.getCurrentUnitObj().reactor = Units.reactorFactory[$(this).val()]();
            app.UI.update();
        });

        $('input[name=chassis]').on('click', function(){
            app.game.getCurrentUnitObj().chassis = Units.chassisFactory[$(this).val()]();
            app.UI.update();
        });

        $('input[name=weapon]').on('change', function(){
            var num, i;
            var curUnit = app.game.getCurrentUnitObj();
            curUnit.weapons = []; // clear current unit's weapon list
            $('input[name=weapon]').each(function(){
                num = parseInt($(this).val());
                if(num > 0) {
                    for(i=0; i < num; i++) {
                        curUnit.weapons.push(Weapons.factory[$(this).data('rel')]());
                    }
                };
            });
            app.UI.update();
        });

        $('input[name=armor]').on('change', function(){
            const curUnit = app.game.getCurrentUnitObj();
            curUnit.armor = parseInt($(this).val());
            curUnit.startingHealthPoints = curUnit.calcStartingHealthPoints();
            curUnit.healthPoints = curUnit.startingHealthPoints;
            app.UI.update();
        });

    }


    /* GAME BOARD */

    drawGamePanel() {
        //console.log('drawGamePanel');

        var gamePanel = $('<div id="gamePanel">');

        var curTeam = app.game.getCurrentTeamObj();

        var phaseText;
        switch (app.game.phase) {
            case Game.phases.PLAYING:
                switch (app.game.subphase) {
                    case Game.subphases.PLACEUNITS :
                        phaseText = 'Deploy Your Units'
                    break;
                    case Game.subphases.GAMEON :
                        phaseText = 'Move &amp; Attack!'
                }
            break;
        }

        var out = '';
        out += '<span id="gp-close">X</span>' +
            '<div id="gp-inner">' +
            '<h2 class="center">' + curTeam.name + '</h2>' +
            '<h3 class="center">' + phaseText + '</h3>' + 
            '<p class="center"><a href="#" id="finishTurn">Finish Turn</a></p>';
        
        out += '<div class="curUnitPanel">Selected Unit:';
        var unit = app.game.getCurrentUnitObj();
        var curUnitPane = this.drawUnitDetails(unit, false, true);
        out += curUnitPane[0].outerHTML;
        out += '</div>'; // curUnitPanel

        if(curTeam.units.length > 1) {
            out += '<div class="otherUnitsPanel">Other Units:';       
            for(var u in curTeam.units) {
                if(u != app.game.getCurrentUnit()) {
                    unit = curTeam.units[u];
                    curUnitPane = this.drawUnitDetails(unit, false);
                    out += curUnitPane[0].outerHTML;
                }
            }
            out += '</div>'; // otherUnitsPanel
        }


        out += '</div>'// gp-inner

        gamePanel.append(out);
        return gamePanel;
    }

    wireGamePanel() {
        //console.log('wireGamePanel');

        $('#gp-close').on('click', function() {
            $('#gamePanel').toggleClass('closed');
        });

        // finish turn
        $('#finishTurn').on('click', function(e) {
            e.preventDefault();
            //if(confirm('End your turn?')) app.startNewTurn();
            app.startNewTurn();
        });

        // if unit name clicked make it the current unit
        $('.otherUnitsPanel .unit h3').on('click', function() {
            console.log('unit name clicked');
            app.game.setCurrentUnit(app.game.getCurrentTeamObj().getUnitIndexByID($(this).data('rel')));
            app.startMoveActionPhase();
        });

        // link to activate move phase on current unit
        $('#actionMove').on('click', function(e){
            e.preventDefault();
            app.startMoveActionPhase()
        });

        // link to activate attack phase on current unit
        $('.fireLink').on('click', function(e){
            e.preventDefault();
            app.game.getCurrentUnitObj().currentWeapon = $(this).attr('href');
            app.startAttackActionPhase();
        });

        $('#convertMPtoAP').on('click', function(e){
            e.preventDefault();
            app.game.getCurrentUnitObj().convertMPtoAP();
            app.UI.update();
        });

    }

    drawGameBoard() {
        // THESE NOTES ARE ASPIRATIONAL, MANY ITEMS NOT IMPLEMENTED!
        // map fills entire screen
        // info panel / draw floats over map along right edge of screen
        // clicking on stuff (units, terrain/  buildings) will populate info panel with related info
        // hoving over things will give abbreviated flyout
        // click and drag on map should scroll it around
        // + and - keys should zoom map in and out
        // map will have many layers, which are shown depends on current state / subphase
        

        this.main.append('<div class="map-wrap" id="mapWrap"><div class="map-drag" id="mapDrag"></div></div>');

        // note that calling order controls stacking, ie, z-index without having to manage z-index
        $('#mapDrag').append(app.maps.terrainMap.draw());
        $('#mapDrag').append(app.maps.featureMap.draw());
        $('#mapDrag').append(app.maps.highlights.draw());
        $('#mapDrag').append(app.maps.units.draw());

        $('#mapDrag').append(app.maps.terrainMap.drawHotSpots());// always make this last

        app.UI.main.append('<div id="tooltip">');
        app.UI.tooltip = $('#tooltip');

        this.wireGameBoard();

        this.main.append(this.drawGamePanel());
        this.wireGamePanel();

    }


    wireGameBoard() {

        $('.hotspot').on('mouseover', function(e) {
            app.UI.showTooltip(e, $(this).data('rel'));
        });
        $('.hotspot').on('mouseout', function(e) {
            app.UI.tooltip.hide();
        });

        $('.hotspot').on('click', function(e){
            console.log('clickity', $(this).data('rel'));

            const coords = $(this).data('rel').split(',');
            const r = parseInt(coords[0]);
            const c = parseInt(coords[1]);

            switch (app.game.phase) {
                case Game.phases.PLAYING:
                    switch (app.game.subphase) {
                        // PLACE UNIT PHASE
                        case Game.subphases.PLACEUNITS :
                            var highlight = app.maps.highlights.getItemByCoords(r, c);
                            if(highlight) { // check to see if we have a Highlight in the clicked hotspot location
                                app.maps.addMapUnit(r, c, app.game.getCurrentUnitObj()); // place the current unit at this location
                                app.maps.highlights.removeItem(highlight.index); // remove the highlight at this location
                                app.game.placeNextUnit(); // move to placing the next unit
                                app.UI.update();
                            }
                        break;

                        // GAME ON PHASE (MOVE & ATTACK)
                        case Game.subphases.GAMEON :
                            //console.log('game on phase click');
                            let mapunit = app.maps.units.getItemByCoords(r, c);
                            // if friendly unit clicked set it to be the current unit
                            if(mapunit && mapunit.obj.unit.team == app.game.currentTeam) {
                                app.game.setCurrentUnit(app.game.getCurrentTeamObj().getUnitIndexByID(mapunit.obj.unit.id));
                                app.startMoveActionPhase();
                                //app.UI.update();
                            }
                            if(app.game.actionPhase == Game.actionPhases.MOVE) {
                                var highlight = app.maps.highlights.getItemByCoords(r, c);
                                if(highlight) { // check to see if we have a Highlight in the clicked hotspot location
                                    
                                    mapunit = app.maps.getCurrentMapUnit();
                                    
                                    // get the path to the targeted hex
                                    let start = app.maps.terrainMap.getHexByCoords(mapunit.r, mapunit.c);
                                    let end = app.maps.terrainMap.getHexByCoords(highlight.obj.r, highlight.obj.c);
                                    let pathAR = app.maps.paths.findPath(start, end, Units.moveCosts[mapunit.unit.chassis.constructor.name]);
                                    // reduce the unit's action points by the number of hexes moved
                                    //console.log(pathAR);
                                    mapunit.unit.spendMovePoints(pathAR.cost);
                                    // scroll through the path, animating the unit to the first hex, then shift that item off and repeat until the path is empty
                                    const el = $('#unit-'+mapunit.unit.id);
                                    app.UI.animateUIElementAlongPath($('#unit-'+mapunit.unit.id), pathAR.path);
                                    const wait = setInterval(function() {
                                        if( !el.is(':animated') ) {
                                            clearInterval(wait);
                                            // set the unit's coords to the targeted hex
                                            mapunit.setPosition(r, c, app.maps);
                                            app.startMoveActionPhase();
                                        }
                                    }, 100);

                                }
                            } else if(app.game.actionPhase == Game.actionPhases.ATTACK) {
                                let targetMapUnit = app.maps.units.getItemByCoords(r, c);
                                // if enemy unit, attack them with the current weapon
                                if(targetMapUnit && targetMapUnit.obj.unit.team != app.game.currentTeam) {
                                    let dmgAR = app.game.getCurrentUnitObj().attack(targetMapUnit.obj);
                                    console.log('targetMapUnit.obj', targetMapUnit.obj);
                                    app.UI.animateAttackDamage(dmgAR, targetMapUnit.obj.cx, targetMapUnit.obj.cy);
                                    const wait = setInterval(function() {
                                        if( !$('.dmg').length ) { // when no .dmg elements exist the animations are complete
                                            clearInterval(wait);
                                            app.startMoveActionPhase();
                                            //app.UI.update();
                                        }
                                    }, 100);
                                }
                            }
                        break;
                    }
                break;
            }

        });
    }

    animateUIElementAlongPath(el, path) {
        if(path.length) {
            $(el).animate({
                left: path[0].x,
                top: path[0].y
            }, 
            500,
            function() {
                path.shift();
                return app.UI.animateUIElementAlongPath(el, path);
            });
        } else {
            return true;
        }       
    }

    animateAttackDamage(dmgAR, x, y) {
        let d = 0;
        const dlen = dmgAR.length;
        let el;
        //console.log(dmgAR);
        app.UI.tooltip.hide();
        for(d; d < dlen; d++) {
            el = $('<div class="dmg">' + ((dmgAR[d]) > 0 ? dmgAR[d] : 'miss!') + '</div>');
            $('#mapDrag').append(el);
            el.css({
                left: (x - el.width() * .5),
                top: y - 30,
                opacity: 0
            });
            setTimeout(function(el){
                el.animate(
                    { opacity: 1, top: '-=50' },
                    500,
                    function(){
                        el.fadeOut(500, function(){
                            $(this).remove();
                            delete this;
                        })
                        
                });
            }, d*400, el);
            
        }
    }



    /***********
     * MAP BUILDER
    ***********/

    drawMapBuilder() {

        // if this is the first load of the map builder, add unitplacementmaps for all teams
        if(!(app.maps.unitPlacementMaps).length) {
            for(let i=0; i < Game.MAXTEAMS; i++) {
                app.maps.unitPlacementMaps.push(new MapList());
            }
        }

        this.main.append('<div class="map-wrap" id="mapWrap"><div class="map-drag" id="mapDrag"></div></div>');

        // note that calling order controls stacking, ie, z-index without having to manage z-index
        $('#mapDrag').append(app.maps.terrainMap.draw());
        $('#mapDrag').append(app.maps.featureMap.draw());
        $('#mapDrag').append(app.maps.highlights.draw());
        $('#mapDrag').append(app.maps.terrainMap.drawHotSpots());// always make this last

        app.UI.main.append('<div id="tooltip">');
        app.UI.tooltip = $('#tooltip');

        this.wireMapBuilder();

        this.main.append(this.drawMapBuilderPanel());
        this.wireMapBuilderPanel();

    }

    wireMapBuilder() {

        $('.hotspot').off('mouseover');
        $('.hotspot').off('mouseout');
        $('.hotspot').off('click');

        $('.hotspot').on('mouseover', function(e) {
            app.UI.showTooltip(e, $(this).data('rel'));
        });
        $('.hotspot').on('mouseout', function(e) {
            app.UI.tooltip.hide();
        });

        $('.hotspot').on('click', function(e) {
            e.preventDefault();
            //console.log('clickity', $(this).data('rel'));
            const coords = app.UI.getCoordsFromStr($(this).data('rel'));
            let newHex, hl;
            switch (app.maps.hexes.MBcurMode) {
                case Hexes.MBmodes.TERRAIN :
                    
                    const curTerrainType = $('input[name="terrainType"]:checked').val();
                    newHex = Hexes.factory[curTerrainType](coords.r, coords.c);
                    app.maps.hexes.MBcurTerrainType = curTerrainType;
                    app.maps.terrainMap.grid[coords.r][coords.c] = newHex;
                    app.UI.update();
                    break;

                case Hexes.MBmodes.FEATURE :
                    hl = app.maps.featureMap.getItemByCoords(coords.r, coords.c);
                    if(!hl) {
                        const curFeatureType = $('input[name="featureType"]:checked').val();
                        newHex = Hexes.factory[curFeatureType](coords.r, coords.c);
                        app.maps.hexes.MBcurFeatureType = curFeatureType;
                        app.maps.featureMap.addItem(newHex);
                        app.maps.hexes.MBcurFeatureIndex = app.maps.featureMap.list.length - 1;
                    } else {
                        app.maps.featureMap.removeItem(hl.index);
                    }

                    
                    app.UI.update();
                    break;
                
                case Hexes.MBmodes.PLACEMENT :
                    // when hotspot clicked:
                    // if no highlight here currently, add a Highlight to the app.maps.highlights list
                    //   then add a Highlight to app.maps.unitPlacementMaps[team] array
                    // else (highlight already here) remove that Highlight from app.maps.highlight list
                    //  and then remove the Highlight from app.maps.unitPlaceMaps[item] 

                    const curTeam = app.maps.hexes.MBcurTeam; // index, not object
                    hl = app.maps.unitPlacementMaps[curTeam].getItemByCoords(coords.r, coords.c);
                    if(!hl) {
                        //app.maps.unitPlacementMaps[curTeam].addItem(new Highlight(coords.r, coords.c, app.maps, false));
                        app.maps.unitPlacementMaps[curTeam].addItem({r: coords.r, c: coords.c});
                    } else {
                        app.maps.unitPlacementMaps[curTeam].removeItem(hl.index);
                    }
                    app.maps.highlights.clear();
                    for(let i=0; i < app.maps.unitPlacementMaps[curTeam].list.length; i++) {
                        hl = app.maps.unitPlacementMaps[curTeam].list[i];
                        app.maps.highlights.addItem(new Highlight(hl.r, hl.c, app.maps, false));
                    }
                    app.UI.update();
                    break;
                default :
            }
            
        });

        $(document).off('keydown');
        if(app.maps.hexes.MBcurMode == Hexes.MBmodes.FEATURE) {
            // plus and minus key will rotate the last Feature that was added to the map
            $(document).on('keydown', function(e){
                if(app.maps.featureMap.list[app.maps.hexes.MBcurFeatureIndex]) {
                    if(e.keyCode == 107) { // plus key
                        app.maps.featureMap.list[app.maps.hexes.MBcurFeatureIndex].rotate += 60;
                        app.UI.update();
                    }
                    if(e.keyCode == 109) { // minus key
                        app.maps.featureMap.list[app.maps.hexes.MBcurFeatureIndex].rotate -= 60;
                        app.UI.update();
                    }
                }
            });
        }
    }

    drawMapBuilderPanel() {
        let out = '<div id="gamePanel" class="mapBuilder">';

        out += '<h2>Map Builder</h2>';

        out += '<h3>Map Size</h3>' +
            '<p><input type="number" id="MBrows" value="' + app.maps.mapRows +'" size="4" /> Rows ' +
            '<input type="number" id="MBcols" value="' + app.maps.mapCols +'" size="4" /> Cols ' +
            '<a href="#" id="updateMapSize">update</a></p>';

        // terrain editor
        out += '<div class="pane terrainPane">' +
            '<h3><input type="radio" name="mapBuilderMode" value="' + Hexes.MBmodes.TERRAIN + '"'
        if(app.maps.hexes.MBcurMode == Hexes.MBmodes.TERRAIN) {    
            out += 'checked'
        }
        out += '/> Terrain Types</h3>';
        for(let i in Hexes.factory) {
            let hex = Hexes.factory[i](0,0);
            if(hex.type == Hexes.hexTypes.TERRAIN) {
                out += '<input type="radio" name="terrainType" value="' + i + '" id="' + i + '"';
                if(i == app.maps.hexes.MBcurTerrainType) out += ' checked ';
                out += '/> ' +
                    '<label for="' + i +'">' + Hexes.factory[i](0,0).desc + '</label><br />';
            }
        }
        out += '<p><a href="#" id="saveTerrainMap">Output Terrain Map</a></p>' + 
            '</div>';

        // feature editor
        out += '<div class="pane featurePane">' +
            '<h3><input type="radio" name="mapBuilderMode" value="' + Hexes.MBmodes.FEATURE + '"'
        if(app.maps.hexes.MBcurMode == Hexes.MBmodes.FEATURE) {    
            out += 'checked'
        }
        out += '/> Feature Types</h3>';
        for(let i in Hexes.factory) {
            let hex = Hexes.factory[i](0,0);
            if(hex.type == Hexes.hexTypes.FEATURE) {
                out += '<input type="radio" name="featureType" value="' + i + '" id="' + i + '"';
                if(i == app.maps.hexes.MBcurFeatureType) out += ' checked ';
                out += '/> ' +
                    '<label for="' + i +'">' + Hexes.factory[i](0,0).desc + '</label><br />';
            }
        }
        out += '<p><a href="#" id="saveFeatureMap">Output Feature Map</a></p>' + 
            '</div>';

        // unit placement editor
        out += '<div class="pane placementPane">' +
        '<h3><input type="radio" name="mapBuilderMode" value="' + Hexes.MBmodes.PLACEMENT + '"'
        if(app.maps.hexes.MBcurMode == Hexes.MBmodes.PLACEMENT) {    
            out += 'checked'
        }
        out += '/> Team Deployment Areas</h3>';
            for(let i=0; i < Game.MAXTEAMS; i++) { // max 4 teams
                out += '<input type="radio" name="team" value="' + i + '" id="team' + i + '"'
                if(i == app.maps.hexes.MBcurTeam) out += ' checked '
                out += '/> ' +
                    '<label for="team' + i +'">Player ' + (i+1) + '</label><br />';
            }
            out += '<p><a href="#" id="savePlacementMap">Output Placement Map</a></p>' + 
                '</div>';

        return out;
    }

    wireMapBuilderPanel() {

        $('#updateMapSize').on('click', function(e){
            e.preventDefault();
            app.maps.mapRows = parseInt($('#MBrows').val());
            app.maps.mapCols = parseInt($('#MBcols').val());
            app.maps.terrainMap = new Map('terrain', app.maps);
            app.UI.update();
        });

        $('input[name="mapBuilderMode"]').on('click', function(e){
            app.maps.hexes.MBcurMode = $(this).val();
            //console.log(app.maps.hexes.MBcurMode);
        });

        $('#saveTerrainMap').on('click', function(e){
            e.preventDefault();
            const data = {
                mapRows: app.maps.mapRows,
                mapCols: app.maps.mapCols,
                grid: []
            }
            let r, c;
            for(r=0; r < app.maps.terrainMap.grid.length; r++) {
                data.grid[r] = [];
                for(c=0; c < app.maps.terrainMap.grid[r].length; c++) {
                    data.grid[r].push(app.maps.terrainMap.grid[r][c].constructor.name);
                }
            }
            // manually copy this output from the console to a mapXX.json file in data/terrainMaps
            // THIS IS NOT A DEBUGGING CONSOLE.LOG!  DO NOT COMMENT OUT
            console.log(JSON.stringify(data));
        });

        $('input[name="team"]').on('click', function(e){
            app.maps.hexes.MBcurTeam = parseInt($(this).val());
            //console.log(app.maps.hexes.MBcurTeam);
            app.UI.update();
        });

        $('#saveFeatureMap').on('click', function(e){
            e.preventDefault();
            const data = [];
            for(let i=0; i < app.maps.featureMap.list.length; i++) {
                data.push({
                    type: app.maps.featureMap.list[i].constructor.name,
                    r: app.maps.featureMap.list[i].r,
                    c: app.maps.featureMap.list[i].c,
                    rotate: app.maps.featureMap.list[i].rotate
                });
            }
            // manually copy this output from the console to a mapXX.json file in data/placementMaps. match the filename of the related terrain map.
            // THIS IS NOT A DEBUGGING CONSOLE.LOG!  DO NOT COMMENT OUT
            console.log(JSON.stringify(data));
        });


        $('#savePlacementMap').on('click', function(e){
            e.preventDefault();
            const data = [];
            for(let i=0; i < app.maps.unitPlacementMaps.length; i++) {
                data.push(app.maps.unitPlacementMaps[i].list);
            }
            // manually copy this output from the console to a mapXX.json file in data/placementMaps. match the filename of the related terrain map.
            // THIS IS NOT A DEBUGGING CONSOLE.LOG!  DO NOT COMMENT OUT
            console.log(JSON.stringify(data));
        });

    }
}