class BootScene extends Phaser.Scene {
    constructor() { super('BootScene'); }

    preload() {
        this.load.setPath('assets/images/');
        this.load.image('bg', 'bg.png');
        
        this.load.image('player_left', 'player_left.png');
        this.load.image('player_center', 'player_center.png'); // Thay cho 'player' cũ
        this.load.image('player_right', 'player_right.png');

        this.load.image('zombie', 'zombie.png');
        this.load.image('bullet', 'bullet.png');

        this.load.image('exp_gem', 'exp_gem.png'); // Ảnh viên kim cương nhỏ

    }
    create() { this.scene.start('GameScene'); }
}