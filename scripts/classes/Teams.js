class Team {

    static TEAMCOLORS = ['blue', 'red', 'green', 'yellow'];

    constructor(name) {
        this.name = name;
        this.units = [];
        this.currentUnit = 0; // index of currently selected unit

        //this.addNewUnit();
    }

    addUnit(unit) {
        this.units.push(unit);
    }

    // adds a unit with default config
    addNewUnit() {
        const unit = Units.unitFactory['LightVehicle'](app.game.currentTeam, 0, []);
        this.addUnit(unit);
    }

    getUnitByID(id) {
        for(var i=0; i< this.units.length; i++) {
            if(this.units[i].id == id) return this.units[i];
        }
    }

    getUnitIndexByID(id) {
        for(var i=0; i< this.units.length; i++) {
            if(this.units[i].id == id) return i;
        }
    }

    // for game/team setup, returns the number of tons remaining to be allocated
    tonsRemaining() {
        let tot = 0, i = 0;
        for(i in this.units) {
            tot += this.units[i].getWeight();
        }
        return app.game.maxTons - tot;
    }

    // at the start of each turn refresh all units actionpoints
    resetActionPoints() {
        for(let i in this.units) {
            if(!this.units[i].destroyed) {
                this.units[i].movePoints = this.units[i].getSpeed();
                this.units[i].attackPoints = 2;
                for (let w in this.units[i].weapons) this.units[i].weapons[w].fired = false;
            }
        }
    }
}