class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        if (this.textures.exists('bg')) {
            this.add.image(270, 480, 'bg').setDisplaySize(540, 960).setDepth(0);
        }

        // =======================================================
        // 1. DỰNG TƯỜNG THÀNH VÀ NGƯỜI CHƠI (Bên dưới màn hình)
        // =======================================================
        
        // Vẽ bức tường phòng thủ
        this.wall = this.add.rectangle(270, 800, 540, 20, 0x95a5a6).setDepth(10);
        this.physics.add.existing(this.wall, true); // Biến tường thành vật cản tĩnh (Static)

        // Vẽ Nhân vật/Súng (Đứng sau tường)
        if (this.textures.exists('player')) {
            this.player = this.physics.add.sprite(270, 850, 'player').setDisplaySize(60, 60).setDepth(11);
        } else {
            this.player = this.add.rectangle(270, 850, 40, 40, 0x3498db).setDepth(11);
            this.physics.add.existing(this.player);
        }

        // =======================================================
        // 2. KHỞI TẠO OBJECT POOLS (HỒ CHỨA VẬT THỂ TÁI SỬ DỤNG)
        // =======================================================

        // A. HỒ CHỨA ĐẠN (Chứa tối đa 50 viên đạn cùng lúc để tránh lag)
        this.bulletPool = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 50,
            createCallback: function (bullet) {
                bullet.setName('bullet');
                bullet.setDepth(5);
                // Ép kích thước nếu chưa có ảnh
                if (!bullet.texture || bullet.texture.key === '__DEFAULT') {
                    bullet.setDisplaySize(10, 20);
                    bullet.setTint(0xf1c40f);
                } else {
                    bullet.setDisplaySize(10, 20);
                }
            }
        });

        // B. HỒ CHỨA QUÁI VẬT (Chứa tối đa 100 con quái)
        this.zombiePool = this.physics.add.group({
            defaultKey: 'zombie',
            maxSize: 100,
            createCallback: function (zombie) {
                zombie.setName('zombie');
                zombie.setDepth(6);
                if (!zombie.texture || zombie.texture.key === '__DEFAULT') {
                    zombie.setDisplaySize(40, 40);
                    zombie.setTint(0xe74c3c);
                } else {
                    zombie.setDisplaySize(40, 40);
                }
            }
        });

        // =======================================================
        // 3. THIẾT LẬP VA CHẠM (COLLIDERS)
        // =======================================================
        
        // Đạn bắn trúng Quái vật
        this.physics.add.overlap(this.bulletPool, this.zombiePool, this.handleBulletHitZombie, null, this);
        
        // Quái vật cắn Tường thành
        this.physics.add.collider(this.zombiePool, this.wall, this.handleZombieHitWall, null, this);

        // =======================================================
        // BÀI TEST CHỨC NĂNG (TẠM THỜI ĐỂ KIỂM TRA POOL)
        // =======================================================
        this.input.on('pointerdown', (pointer) => {
            // Click để sinh đạn bay tới điểm click
            this.fireBullet(pointer.x, pointer.y);
        });

        // Tự động đẻ quái từ trên trời rơi xuống mỗi giây
        this.time.addEvent({
            delay: 1000,
            callback: this.spawnZombie,
            callbackScope: this,
            loop: true
        });
    }

    // --- HÀM BẮN ĐẠN TÁI CHẾ ---
    fireBullet(targetX, targetY) {
        // Rút 1 viên đạn tàng hình từ trong hồ ra (Nếu hồ đầy 50 viên thì trả về null)
        let bullet = this.bulletPool.get(this.player.x, this.player.y);
        
        if (bullet) {
            bullet.setActive(true);
            bullet.setVisible(true);
            
            // Xoay súng hướng về mục tiêu
            let angle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
            this.player.rotation = angle + Math.PI/2;
            bullet.rotation = angle + Math.PI/2;

            // Bắn đạn đi với tốc độ 600px/s
            this.physics.moveTo(bullet, targetX, targetY, 600);
        }
    }

    // --- HÀM SINH QUÁI TÁI CHẾ ---
    spawnZombie() {
        let spawnX = Phaser.Math.Between(50, 490);
        let spawnY = -50; // Xuất hiện ngoài rìa trên màn hình

        // Rút 1 con quái từ hồ ra
        let zombie = this.zombiePool.get(spawnX, spawnY);

        if (zombie) {
            zombie.setActive(true);
            zombie.setVisible(true);
            
            // Ép quái vật đi thẳng xuống vách tường thành
            this.physics.moveTo(zombie, spawnX, this.wall.y, 100);
        }
    }

    // --- SỰ KIỆN ĐẠN TRÚNG QUÁI ---
    handleBulletHitZombie(bullet, zombie) {
        // Tắt hoạt động của đạn và nhét ngược lại vào hồ (KHÔNG DESTROY)
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.stop(); // Dừng vật lý

        // Tắt hoạt động của quái và nhét ngược lại vào hồ (KHÔNG DESTROY)
        zombie.setActive(false);
        zombie.setVisible(false);
        zombie.body.stop();
        
        console.log("Đã diệt 1 Zombie!");
    }

    // --- SỰ KIỆN QUÁI CHẠM TƯỜNG ---
    handleZombieHitWall(zombie, wall) {
        // Quái vật sẽ bị kẹt lại trước tường (do Arcade Collider)
        // Lát nữa ở Giai đoạn 4, ta sẽ trừ máu tường ở đây!
    }

    update() {
        // QUẢN LÝ DỌN RÁC (THU HỒI ĐẠN BAY RA KHỎI MÀN HÌNH)
        this.bulletPool.getChildren().forEach(bullet => {
            if (bullet.active && (bullet.y < 0 || bullet.x < 0 || bullet.x > 540 || bullet.y > 960)) {
                bullet.setActive(false);
                bullet.setVisible(false);
                bullet.body.stop();
            }
        });
    }
}