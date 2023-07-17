
class Reactor {
    constructor(name, power, weight) {
        this.name   = name;
        this.power  = power;
        this.weight = weight;
    }
}

class LightReactor extends Reactor {
    constructor() {
        super('Light', 50, 10);
    }
}
class MediumReactor extends Reactor {
    constructor() {
        super('Medium', 100, 20);
    }
}
class HeavyReactor extends Reactor {
    constructor() {
        super('Heavy', 150, 30);
    }
}
class AssaultReactor extends Reactor {
    constructor() {
        super('Assault', 200, 40);
    }
}


class Chassis {
    constructor(name, weight, speedMod) {
        this.name       = name;
        this.weight     = weight;
        this.speedMod   = speedMod;
    }
}

class VehicleChassis extends Chassis {
    constructor() {
        super('Vehicle', 10, 2);
    }
}
class TankChassis extends Chassis {
    constructor() {
        super('Tank', 20, 1);
    }
}
class MechChassis extends Chassis {
    constructor() {
        super('Mech', 30, 0);
    }
}


class Unit {

    constructor(team, chassis, reactor, armor, weapons) {
        this.id      = this.makeUUID();
        this.name    = 'Unit';
        this.team    = team;    // storing this unit's team for easy reference
        this.chassis = chassis; // Chassis object
        this.reactor = reactor; // Reactor object
        this.armor   = armor;   // number, tons of armor / AP
        this.weapons = weapons; // array of Weapon objects

        this.movePoints = 0;
        this.attackPoints = 0;

        this.currentWeapon = 0; // index of selected weapon

        this.startingHealthPoints = this.calcStartingHealthPoints();
        this.healthPoints = this.startingHealthPoints;

        // MOVED TO UNITHEX
        //this.visible = false; // for Line of Sight... is this unit visible to the current team's units

        this.destroyed = false;
    }

    makeUUID() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    getName() {
        if(this.destroyed) return '[DESTROYED]' + ' ' + this.name;
        return this.name; 
    }

    getWeight() {
        var i = 0, weaponWeight = 0;
        for(i=0; i<this.weapons.length; i++) weaponWeight += this.weapons[i].weight;
        return this.reactor.weight + this.chassis.weight + this.armor + weaponWeight;
    }

    getSpeed() {
        return Math.floor(10 - ((this.getWeight() / this.reactor.power) * 10)) + this.chassis.speedMod;
    }

    calcStartingHealthPoints() {
        return 10 + (this.armor * 10);
    }

    getWeaponTypeCount(name) {
        var i = 0, cnt = 0;
        for(i; i < this.weapons.length; i++) {
            if(this.weapons[i].name == name) cnt++;
        }
        return cnt;
    }

    spendMovePoints(points) {
        this.movePoints -= points;
    }

    attack(targetMapUnit) {
        //console.log('target', targetMapUnit);
        const weapon = this.weapons[this.currentWeapon];
        const dmgAR = [];
        
        if(weapon.ammo > 0) {
            let rndCnt = weapon.rounds;
            const thisMapUnit = app.maps.units.getUnitByID(this.id).obj;            
            const distance = app.maps.paths.distance({r:thisMapUnit.r, c:thisMapUnit.c}, {r:targetMapUnit.r, c:targetMapUnit.c});
            const terrain = app.maps.terrainMap.getHexByCoords(targetMapUnit.r, targetMapUnit.c);
            const feature = app.maps.featureMap.getItemByCoords(targetMapUnit.r, targetMapUnit.c);
            const cover = terrain.cover + ((feature) ? feature.cover : 0); // cover provided by terrain and feature
            const toHit = weapon.toHit - cover - (distance * weapon.toHitMod);
            //console.log(weapon.toHit, distance, weapon.toHitMod, cover, toHit);
            while (rndCnt > 0 && !targetMapUnit.unit.destroyed) { // destroyed check bc previous round in this salvo might have destroyed the target
                let hitRoll = Math.random();
                //console.log('hitRoll, toHit', hitRoll, toHit);
                if(hitRoll <= toHit){
                    // if toHit is 95 or higher this is a critical hit.  full weapon dmg is applied.  otherwise, random dmg
                    let dmg = (hitRoll < .95) ? Math.ceil(Math.random() * weapon.dmg) : weapon.dmg; 
                    targetMapUnit.unit.takeDamage(dmg);
                    dmgAR.push(dmg);
                } else {
                    //console.log('rnd '+rndCnt+' missed');
                    dmgAR.push(0);
                }
                rndCnt--;
            }
            weapon.ammo -= ((weapon.ammo != App.INF) ? weapon.rounds : 0);
            this.attackPoints -= weapon.fireCost;
            weapon.fired = true;
            this.currentWeapon = false;
            return dmgAR; // returns damage array (one item per hit) so UI can render them
        }

    }

    takeDamage(dmg) {
        this.healthPoints -= dmg;
        //console.log(this.id + 'unit taking ' + dmg + ' damage, new HP:' + this.healthPoints);
        if(this.healthPoints <= 0) {
            this.destroy();
        }
    }

    destroy() {
        console.log(this.id + ' unit destroyed!');
        this.destroyed = true;
        this.healthPoints = 0;
        this.movePoints = 0;
        this.attackPoints = 0;
        for(let i in this.weapons) this.weapons[i].ammo = 0;
        let destroyedMapUnit = app.maps.units.getUnitByID(this.id);
        if(destroyedMapUnit) app.maps.units.removeItem(destroyedMapUnit.index);
    }

    convertMPtoAP() {
        // if remaining move points are greater than half of speed, subtract have of speed from MP and add 1 to AP
        console.log(this.movePoints, this.getSpeed() * .5);
        if(this.movePoints >= this.getSpeed() * .5) {
            this.movePoints -= this.getSpeed() * .5;
            this.attackPoints++;
        } else {
            alert('You must have at least half of your maximum Move Points remaining');
        }
    }

    // draws a colored circle for all units with highlight if selected unit and healthbar.  unit SVGs get added on top of this in subclasses.
    baseDraw() {
        const canvas = $('<canvas width="' + (app.maps.mapUnitWidth) + 'px" height="' + (app.maps.mapUnitHeight + 7) + 'px" class="unit" id="unit-' + this.id +'">');
        const ctx = canvas[0].getContext('2d');
        const x = app.maps.mapUnitWidth * .5; // center of canvas
        const y = app.maps.mapUnitHeight * .5; // center of canvas
        const r = app.maps.scaleUnit * .33; // radius of circle
        ctx.beginPath();
        ctx.arc(x, y, r, 2*Math.PI, false);
        ctx.closePath();
        // ctx.fillStyle = Team.TEAMCOLORS[this.team];
        // ctx.fill();
        // add a while stroke if this is the currently selected unit
        if(app.game.getCurrentUnitObj().id == this.id) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
            ctx.lineWidth = 3; //app.maps.scaleUnit * .05;
            ctx.stroke();
        }
        // draw the health bar
        const healthPerc = this.healthPoints / this.startingHealthPoints;
        ctx.beginPath();
        ctx.fillStyle = 'rgba(255, 0, 0, 1)';
        ctx.strokeStyle = 'rgba(255, 255, 255, 0)';
        ctx.fillRect(10, app.maps.mapUnitHeight + 7, app.maps.mapUnitWidth - 20, -7);
        ctx.closePath();
        ctx.beginPath();
        ctx.fillStyle = 'rgba(0, 255, 0, 1)';
        ctx.fillRect(10, app.maps.mapUnitHeight + 7, healthPerc * (app.maps.mapUnitWidth - 20), -7);
        ctx.closePath();
        return canvas;
    }

    draw() { // only gets called if this base class has been used instead of a subclass
        this.baseDraw();
    }

}

    class LightVehicle extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Vehicle(), 
                Units.reactorFactory.Light(), 
                armor, 
                weapons
            );
            this.name = 'Light Vehicle';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');

            // this approach works.  loads external .svg file.  less control over final rendering so not using it, but keeping it as backup
            // const img = new Image();
            // img.onload = function() {
            //     ctx.drawImage(img, 0, 0);
            // }
            // img.src = 'http://localhost/mekwar/gitroot/img/units/LightVehicle.svg';

            const path = new Path2D(SVGs.units.LightVehicle);
            ctx.scale(.09, .09);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);

            return canvas;
        }
    }

    class MediumVehicle extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Vehicle(), 
                Units.reactorFactory.Medium(), 
                armor, 
                weapons
            );
            this.name = 'Medium Vehicle';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.units.MediumVehicle);
            ctx.scale(.09, .09);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }

    class HeavyVehicle extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Vehicle(), 
                Units.reactorFactory.Heavy(), 
                armor, 
                weapons
            );
            this.name = 'Heavy Vehicle';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.units.HeavyVehicle);
            ctx.scale(.09, .09);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }

    class AssaultVehicle extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Vehicle(), 
                Units.reactorFactory.Assault(), 
                armor, 
                weapons
            );
            this.name = 'Assault Vehicle';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.units.AssaultVehicle);
            ctx.scale(.09, .09);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }


    /* Tanks */

    class LightTank extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Tank(), 
                Units.reactorFactory.Light(), 
                armor, 
                weapons
            );
            this.name = 'Light Tank';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');

            const path = new Path2D(SVGs.units.LightTank);
            ctx.scale(.07, .07);
            ctx.translate(50, 50);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);

            return canvas;
        }
    }

    class MediumTank extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Tank(), 
                Units.reactorFactory.Medium(), 
                armor, 
                weapons
            );
            this.name = 'Medium Tank';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.units.MediumTank);
            ctx.scale(.09, .09);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }

    class HeavyTank extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Tank(), 
                Units.reactorFactory.Heavy(), 
                armor, 
                weapons
            );
            this.name = 'Heavy Tank';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.units.HeavyTank);
            ctx.scale(.09, .09);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }

    class AssaultTank extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Tank(), 
                Units.reactorFactory.Assault(), 
                armor, 
                weapons
            );
            this.name = 'Assault Tank';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.units.AssaultTank);
            ctx.scale(.09, .09);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }

    /* Mechs */

    class LightMech extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Mech(), 
                Units.reactorFactory.Light(), 
                armor, 
                weapons
            );
            this.name = 'Light Mech';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');

            const path = new Path2D(SVGs.units.LightMech);
            ctx.scale(.09, .09);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);

            return canvas;
        }
    }

    class MediumMech extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Mech(), 
                Units.reactorFactory.Medium(), 
                armor, 
                weapons
            );
            this.name = 'Medium Mech';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.units.MediumMech);
            ctx.scale(.08, .08);
            ctx.translate(50, 0);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }

    class HeavyMech extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Mech(), 
                Units.reactorFactory.Heavy(), 
                armor, 
                weapons
            );
            this.name = 'Heavy Mech';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.units.HeavyMech);
            ctx.scale(.08, .08);
            ctx.translate(50, 0);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }

    class AssaultMech extends Unit {
        constructor(team, armor, weapons) {
            super(team, 
                Units.chassisFactory.Mech(), 
                Units.reactorFactory.Assault(), 
                armor, 
                weapons
            );
            this.name = 'Assault Mech';
        }

        draw() {
            const canvas = this.baseDraw();
            const ctx = canvas[0].getContext('2d');
            const path = new Path2D(SVGs.units.AssaultMech);
            ctx.scale(.09, .09);
            ctx.strokeStyle = 'black';
            ctx.lineWidth = 10; // stroke has to be scaled up to offset scale down
            ctx.fillStyle = Team.TEAMCOLORS[this.team];
            ctx.fill(path);
            ctx.stroke(path);
            return canvas;
        }
    }


class Units {
    
    static reactorFactory = {
        Light   : function() { return new LightReactor() },
        Medium  : function() { return new MediumReactor() },
        Heavy   : function() { return new HeavyReactor() },
        Assault : function() { return new AssaultReactor() }
    }

    static chassisFactory = {
        Vehicle : function() { return new VehicleChassis() },
        Tank    : function() { return new TankChassis() },
        Mech    : function() { return new MechChassis() }
    }

    static unitFactory = {
        LightVehicle        : function(team, armor, weapons) { return new LightVehicle(team, armor, weapons) },
        MediumVehicle       : function(team, armor, weapons) { return new MediumVehicle(team, armor, weapons) },
        HeavyVehicle        : function(team, armor, weapons) { return new HeavyVehicle(team, armor, weapons) },
        AssaultVehicle      : function(team, armor, weapons) { return new AssaultVehicle(team, armor, weapons) },

        LightTank           : function(team, armor, weapons) { return new LightTank(team, armor, weapons) },
        MediumTank          : function(team, armor, weapons) { return new MediumTank(team, armor, weapons) },
        HeavyTank           : function(team, armor, weapons) { return new HeavyTank(team, armor, weapons) },
        AssaultTank         : function(team, armor, weapons) { return new AssaultTank(team, armor, weapons) },

        LightMech           : function(team, armor, weapons) { return new LightMech(team, armor, weapons) },
        MediumMech          : function(team, armor, weapons) { return new MediumMech(team, armor, weapons) },
        HeavyMech           : function(team, armor, weapons) { return new HeavyMech(team, armor, weapons) },
        AssaultMech         : function(team, armor, weapons) { return new AssaultMech(team, armor, weapons) }
    }

    // these keys match constructor.name of unit.chassis, and are used to look up the associated index in Hex moveCost arrays
    static moveCosts = {
        'VehicleChassis': 0,
        'TankChassis'   : 1,
        'MechChassis'   : 2        
    }

}
