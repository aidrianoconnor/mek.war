
class Weapon {
    constructor(name, range, minrange, cat, dmg, rounds, weight, ammo, toHit, toHitMod, fireCost) {
        this.name = name;
        this.range = range;
        this.minrange = minrange;
        this.cat = cat;
        this.dmg = dmg; // per round
        this.rounds = rounds; // number of projectiles per shot
        this.weight = weight;
        this.ammo = ammo;
        this.toHit = toHit;
        this.toHitMod = toHitMod; // accuracy dropoff over distance
        this.fireCost = fireCost; // how many points does it cost to fire this weapon
        this.fired = false; // has this weapon been fired yet this turn?
    }

}
class MiniGun extends Weapon {
    constructor() {
        super (
            'MiniGun', // name
            3,   // range
            0,   // minrange
            Weapons.cats.BALLISTIC, // cat
            3,   // dmg
            6,   // rounds
            5,  // weight
            120, // ammo
            .7,  // toHit
            .05, // toHitMod
            1    // fireCost
        );
    }
}

class SmallLaser extends Weapon {
    constructor() {
        super (
            'Small Laser', // name
            2,   // range
            0,   // minrange
            Weapons.cats.LASER, // cat
            15,   // dmg
            1,   // rounds
            5,  // weight
            App.INF, // ammo
            .75,  // toHit
            .025, // toHitMod
            1    // fireCost
        );
    }
}

class ShortRangeMissles extends Weapon {
    constructor() {
        super (
            'Short Range Missles', // name
            3,  // range
            0,   // minrange
            Weapons.cats.MISSLE, // cat
            7,  // dmg
            2, // rounds
            5, // weight
            20, // ammo
            .75, // toHit
            0, // toHitMod
            1   // fireCost
        );
    }
}

class MediumLaser extends Weapon {
    constructor() {
        super (
            'Medium Laser', // name
            4,   // range
            0,   // minrange
            Weapons.cats.LASER, // cat
            30,   // dmg
            1,   // rounds
            10,  // weight
            App.INF,  // ammo
            .75, // toHit
            .025, // toHitMod
            2    // fireCost
        );
    }
}

class AutoCannon extends Weapon {
    constructor() {
        super (
            'AutoCannon', // name
            0,   // range
            1,   // minrange
            Weapons.cats.BALLISTIC, // cat
            20,   // dmg
            2,   // rounds
            12,  // weight
            20, // ammo
            .75,  // toHit
            .05, // toHitMod
            2    // fireCost
        );
    }
}

class LargeLaser extends Weapon {
    constructor() {
        super (
            'Large Laser', // name
            6,   // range
            2,   // minrange
            Weapons.cats.LASER, // cat
            30,   // dmg
            1,   // rounds
            15,  // weight
            App.INF,  // ammo
            .75, // toHit
            .025, // toHitMod
            2    // fireCost
        );
        this.toHitMod = .05;
    }
}

class RailGun extends Weapon {
    constructor() {
        super (
            'Rail Gun', // name
            7,   // range
            3,   // minrange
            Weapons.cats.BALLISTIC, // cat
            60,   // dmg
            1,   // rounds
            20,  // weight
            10, // ammo
            .8,  // toHit
            .025, // toHitMod
            4    // fireCost
        );
    }
}

class LongRangeMissles extends Weapon {
    constructor() {
        super (
            'Long Range Missles', // name
            8,  // range
            4,   // minrange
            Weapons.cats.MISSLE, // cat
            4,  // dmg
            20, // rounds
            20, // weight
            100, // ammo
            .5, // toHit
            4   // fireCost
        );
    }
}


class Weapons {

    static cats = {
        BALLISTIC : 'Balistic',
        MISSLE : 'Missle',
        LASER : 'Laser'
    }

    static factory = {
        'MiniGun'           : function() { return new MiniGun() },
        'SmallLaser'        : function() { return new SmallLaser() },
        'ShortRangeMissles' : function() { return new ShortRangeMissles() },
        'MediumLaser'       : function() { return new MediumLaser() },
        'AutoCannon'        : function() { return new AutoCannon() },
        'LargeLaser'        : function() { return new LargeLaser() },
        'RailGun'           : function() { return new RailGun() },
        'LongRangeMissles'  : function() { return new LongRangeMissles() }
    }

    constructor() {
        
    }

    // MiniGun() { return new MiniGun(); }
    // SmallLaser() { return new SmallLaser(); }
    // ShortRangeMissles() { return new ShortRangeMissles(); }
    // MediumLaser() { return new MediumLaser(); }
    // AutoCannon() { return new AutoCannon(); }
    // LargeLaser() { return new LargeLaser(); }
    // RailGun() { return new RailGun(); }
    // LongRangeMissles() { return new LongRangeMissles(); }

}
