class GameScene extends Phaser.Scene {
    constructor() {
        super('GameScene');
    }

    create() {
        if (this.textures.exists('bg')) {
            this.add.image(270, 480, 'bg').setDisplaySize(540, 960).setDepth();
        }

       // this.physics.world.setBounds(0, 0, 540, 960);

        // =======================================================
        // 1. DỰNG TƯỜNG THÀNH VÀ NGƯỜI CHƠI (Bên dưới màn hình)
        // =======================================================
        
        // Vẽ bức tường phòng thủ
          this.wall = this.add.rectangle(270, 800, 540, 20, 0x95a5a6).setDepth(5000);
        this.physics.add.existing(this.wall, true); 
        this.wall.setName('wall');

    

        // --- ĐÃ SỬA: BỎ setDisplaySize, DÙNG setScale ĐỂ TRÁNH LỖI ĐỔI ẢNH ---
        if (this.textures.exists('player_center')) {
            this.player = this.physics.add.sprite(270, 850, 'player_center').setScale(0.3).setDepth(5001); // Dùng Scale 1.0 hoặc tùy chỉnh
        } else {
            this.player = this.add.rectangle(270, 850, 80, 120, 0x3498db).setDepth(5001);
            this.physics.add.existing(this.player);
        }

        // =======================================================
        // 2. KHỞI TẠO OBJECT POOLS (HỒ CHỨA VẬT THỂ TÁI SỬ DỤNG)
        // =======================================================

      // A. HỒ CHỨA ĐẠN (ĐÃ FIX LỖI NẢY TRẦN NHÀ)
        this.bulletPool = this.physics.add.group({
            defaultKey: 'bullet',
            maxSize: 100,
            createCallback: function (bullet) {
                bullet.setName('bullet');
                bullet.setDepth(5);
                bullet.hitTargets = []; 
                 
                if (!bullet.texture || bullet.texture.key === '__DEFAULT') {
                    bullet.setDisplaySize(20, 30);
                    bullet.setTint(0xf1c40f);
                } else {
                    bullet.setDisplaySize(20, 30);
                }

               // bullet.setCollideWorldBounds(true);
                bullet.setBounce(1, 1); 

                // --- MA THUẬT NẰM Ở ĐÂY: KHÓA NẢY TRẦN VÀ ĐÁY ---
                // Chỉ cho phép đạn va chạm với mép Trái và mép Phải của Camera
                // Đạn sẽ bay xuyên tọt qua trần nhà và đáy màn hình để hàm Update thu hồi!
                bullet.body.checkCollision.up = false;
                bullet.body.checkCollision.down = false;
            }
        });

        // B. HỒ CHỨA QUÁI VẬT (Chứa tối đa 100 con quái)
        this.zombiePool = this.physics.add.group({
            defaultKey: 'zombie',
            maxSize: 50,
            createCallback: function (zombie) {
                zombie.setName('zombie');
                zombie.setDepth(6);
                zombie.id = Phaser.Utils.String.UUID(); 
                
                if (!zombie.texture || zombie.texture.key === '__DEFAULT') {
                    zombie.setDisplaySize(90, 100);
                    zombie.setTint(0xe74c3c);
                } else {
                    zombie.setDisplaySize(90, 100);
                }
            }   
        });

         this.bulletPool.createMultiple({ key: 'bullet', quantity: 100, active: false, visible: false, setXY: { x: -999, y: -999 } });
        this.zombiePool.createMultiple({ key: 'zombie', quantity: 50, active: false, visible: false, setXY: { x: -999, y: -999 } });

         // B.05. HỒ CHỨA CHỮ SÁT THƯƠNG (Tái sử dụng Text để không bị lag khi xả đạn)
        this.dmgTextPool = this.add.group({
            maxSize: 50,
            classType: Phaser.GameObjects.Text, // Báo cho Phaser biết đây là nhóm chứa Text
            createCallback: function (txt) {
                txt.setDepth(100);
                txt.setOrigin(0.5);
                txt.setStyle({ font: 'bold 22px Arial', fill: '#ffeb3b', stroke: '#000', strokeThickness: 4 });
                txt.setActive(false);
                txt.setVisible(false);
            }
        });


        // C. HỒ CHỨA HẠT KINH NGHIỆM (Chứa tối đa 200 hạt)
        this.expPool = this.physics.add.group({
            defaultKey: 'exp_gem',
            maxSize: 200,
            createCallback: function (gem) {
                gem.setName('exp_gem');
                gem.setDepth(4);
                if (!gem.texture || gem.texture.key === '__DEFAULT') {
                    gem.setDisplaySize(15, 15);
                    gem.setTint(0x2ecc71); // Màu xanh lá
                } else {
                    gem.setDisplaySize(15, 15);
                }
            }
        });

        // =======================================================
        // --- THÊM: HỆ THỐNG LEVEL VÀ THANH EXP (TRÊN CÙNG MÀN HÌNH) ---
        // =======================================================
        this.playerLevel = 1;
        this.currentExp = 0;
        this.maxExp = 200; // Mốc lên cấp 2

        this.expBg = this.add.rectangle(270, 20, 500, 15, 0x333333).setDepth(100);
        this.expFill = this.add.rectangle(20, 20, 0, 15, 0x3498db).setOrigin(0, 0.5).setDepth(101);
        this.levelText = this.add.text(270, 20, `LV. 1`, { font: 'bold 12px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(102);

        // Bật tính năng va chạm để hút EXP
        this.physics.add.overlap(this.player, this.expPool, (player, gem) => {
            this.collectExp(player, gem);
        });
        // =======================================================
        // 3. THIẾT LẬP VA CHẠM (COLLIDERS)
        // =======================================================
        
        // Đạn bắn trúng Quái vật
        this.physics.add.overlap(this.bulletPool, this.zombiePool, this.handleBulletHitZombie, null, this);
        
        // Quái vật cắn Tường thành
        this.physics.add.collider(this.zombiePool, this.wall, this.handleZombieHitWall, null, this);

        

     
        // BÀI TEST CHỨC NĂNG (TẠM THỜI ĐỂ KIỂM TRA POOL)
        // =======================================================
        this.input.on('pointerdown', (pointer) => {
            // Click để sinh đạn bay tới điểm click
            this.fireBullet(pointer.x, pointer.y);
        });

        // Tự động đẻ quái từ trên trời rơi xuống mỗi giây
        this.time.addEvent({
            delay: 2000,
            callback: this.spawnZombie,
            callbackScope: this,
            loop: true
        });

        // =======================================================
        // 4. THÔNG SỐ VŨ KHÍ & RADAR TỰ ĐỘNG BẮN
        // =======================================================
        this.fireRate = 600; // Thời gian giữa các lần bắn (ms)
        this.weaponCooldown = 0; // Thời gian còn lại trước khi có thể bắn tiếp (ms)
        
       this.skills = {
            rapid_fire: 0,   // Tốc độ bắn
            pierce: 0,       // Xuyên thấu (Cấp 1 = Xuyên 5. Mỗi cấp +1)
            explosive: 0,    // Nổ lan (Sát thương = Cấp * 5. Bán kính = 80 + Cấp*10)
            multi_shot: 0,   // Bắn đa tia (Chỉ xuất hiện sau Lv.5)
            bounce: 0        // Đạn nảy tường (Chỉ xuất hiện sau Lv.5)
        };
        
        // BIẾN QUẢN LÝ LAZE DRONE (Chỉ xuất hiện sau Lv.5)
          this.hasDrone = false;
        this.droneLevel = 0; // Cấp 1, 2, 3 tương ứng cooldown 10s, 7s, 5s
        
        // Cooldown động theo Level
        this.getDroneCooldown = () => {
            if (this.droneLevel === 1) return 10000;
            if (this.droneLevel === 2) return 7000;
            return 5000; // Cấp 3 (Tối đa)
        };
        
        this.droneTimer = 0; 
        this.isDroneFiring = false;

        // Radar quét mục tiêu độc lập (Tránh quét 60 lần/giây gây lag)
        this.currentTarget = null;
        this.manualTarget = null; 
        this.isManualFiring = false;
        this.time.addEvent({
            delay: 100, // Cứ 100ms (0.1s) Radar quét 1 lần tìm quái
            callback: this.findNearestZombie,
            callbackScope: this,
            loop: true
        });

         // =======================================================
        // --- THÊM MỚI: QUẢN LÝ BẮN THỦ CÔNG (MANUAL FIRE) ---
        // =======================================================
        this.isManualFiring = false; 
        this.manualTimeoutEvent = null; // Biến lưu trữ Timer để reset lại 0.5s

        // SỰ KIỆN NHẤN CHUỘT / CHẠM MÀN HÌNH (GHI ĐÈ LÊN SỰ KIỆN CŨ CỦA CẬU)
        this.input.on('pointerdown', (pointer) => {
            this.handleManualFire(pointer);
        });

        // HỖ TRỢ KÉO LƯỚT (Bấm giữ và quét ngón tay để xả đạn liên tục)
        this.input.on('pointermove', (pointer) => {
            if (pointer.isDown) { // Chỉ bắn khi đang đè chuột/ngón tay
                this.handleManualFire(pointer);
            }
        });

          // --- THÊM: HỆ THỐNG MÁU TƯỜNG THÀNH (HP WALL) ---
        // =======================================================
        this.wallMaxHp = 100;
        this.wallHp = 100;
        
        // Thanh máu tường ngay trên đầu người chơi
        this.wallHpBg = this.add.rectangle(270, 780, 200, 10, 0x333333).setDepth(11);
        this.wallHpFill = this.add.rectangle(170, 780, 200, 10, 0x2ecc71).setOrigin(0, 0.5).setDepth(12);
        this.wallHpText = this.add.text(270, 780, `${this.wallHp}/${this.wallMaxHp}`, { font: 'bold 10px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(13);

    }

    // --- HÀM BẮN ĐẠN TÁI CHẾ (ĐÃ FIX LỖI TÀNG HÌNH) ---
  // --- HÀM BẮN ĐẠN TÁI CHẾ (HỖ TRỢ ĐA TIA VÀ ĐẠN NẢY) ---
   fireBullet(targetX, targetY) {
        let centerAngle = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
        let bulletCount = 1 + (this.skills.multi_shot * 2); 
        let spreadAngleRadian = Phaser.Math.DegToRad(15); 
        let startAngle = centerAngle - (Math.floor(bulletCount / 2) * spreadAngleRadian);

        for (let i = 0; i < bulletCount; i++) {
            let currentBulletAngle = startAngle + (i * spreadAngleRadian);
            
            let vX = Math.cos(currentBulletAngle);
            let vY = Math.sin(currentBulletAngle);

            let bullet = this.bulletPool.getFirstDead(false, this.player.x, this.player.y);
            
            if (bullet) {
                bullet.setActive(true);
                bullet.setVisible(true);
                
                // --- ĐÃ FIX CỨNG: Ép tạo một Array hoàn toàn mới và Độc Lập cho mỗi viên đạn ---
                bullet.hitTargets = new Array(); 
                
                bullet.bouncesLeft = this.skills.bounce > 0 ? 3 : 0; 
                bullet.rotation = currentBulletAngle + Math.PI/2;

                let speed = 800; 
                // Cú lừa Physics: Bắt buộc gọi setVelocity để đè đứt mọi quán tính cũ từ kiếp trước của viên đạn
                bullet.body.setVelocity(vX * speed, vY * speed);
            }
        }
    }

    // =======================================================
    // HỆ THỐNG DRONE LASER HỦY DIỆT
    // =======================================================
    activateDrone() {
        this.droneLevel++; // Nâng cấp drone

        if (!this.droneSprite) {
            // LẦN ĐẦU HỌC KỸ NĂNG: Khởi tạo Drone lơ lửng bên trái súng (X=150, Y=850)
            if (this.textures.exists('drone')) {
                this.droneSprite = this.add.sprite(150, 850, 'drone').setDisplaySize(60, 60).setDepth(15);
            } else {
                this.droneSprite = this.add.circle(150, 850, 20, 0x00bcd4).setDepth(15);
            }

            // Hoạt ảnh lơ lửng nhịp nhàng vĩnh viễn (Idle Animation)
            this.tweens.add({
                targets: this.droneSprite, y: 840, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut'
            });

            // Khởi động đồng hồ đếm ngược chờ bắn
            this.droneTimer = this.time.now + this.getDroneCooldown();
            
            // Vẽ sẵn tia Laser nhưng ẨN ĐI
            if (this.textures.exists('laser_beam')) {
                this.laserBeam = this.add.sprite(0, 0, 'laser_beam').setOrigin(0.5, 1).setDepth(14).setVisible(false).setAlpha(0.8);
            } else {
                this.laserBeam = this.add.rectangle(0, 0, 20, 1000, 0x00ffff, 0.8).setOrigin(0.5, 1).setDepth(14).setVisible(false);
            }
            
            // Đường thẳng Toán học (Geom Line) để quét sát thương
            this.laserLine = new Phaser.Geom.Line(0, 0, 0, 0);
        } else {
            console.log(`Drone nâng lên Cấp ${this.droneLevel}! Cooldown: ${this.getDroneCooldown() / 1000}s`);
        }
    }

    fireDroneLaser() {
        this.isDroneFiring = true;
        
        // 1. CHỌN VỊ TRÍ BAY NGẪU NHIÊN TRÊN TRỤC NGANG CỦA DRONE (X từ 50 đến 490, Y giữ nguyên 850)
        let targetDroneX = Phaser.Math.Between(50, 490);
        
        // 2. CHỌN ĐIỂM NGẮM NGẪU NHIÊN Ở ĐỈNH MÀN HÌNH (X từ 0 đến 540, Y = 0)
        let targetAimX = Phaser.Math.Between(0, 540);
        let targetAimY = 0;

        // DỪNG HOẠT ẢNH LƠ LỬNG CŨ, BAY NHANH ĐẾN VỊ TRÍ BẮN
        this.tweens.killTweensOf(this.droneSprite);
        
        this.tweens.add({
            targets: this.droneSprite,
            x: targetDroneX,
            y: 850,
            duration: 300,
            ease: 'Power2',
            onComplete: () => {
                // --- ĐÃ TỚI VỊ TRÍ: BẮT ĐẦU XẢ LASER ---
                
                // Tính góc xoay từ Drone đến điểm ngắm đỉnh màn hình
                let angleRad = Phaser.Math.Angle.Between(targetDroneX, 850, targetAimX, targetAimY);
                this.droneSprite.rotation = angleRad + Math.PI/2; // Drone chĩa nòng theo góc

                // Thiết lập Tọa độ Tia Laser (Gốc bắt đầu từ mồm Drone)
                this.laserBeam.setPosition(targetDroneX, 850);
                this.laserBeam.rotation = angleRad + Math.PI/2;
                
                // Kéo dài tia Laser chạm tới trần nhà
                let dist = Phaser.Math.Distance.Between(targetDroneX, 850, targetAimX, targetAimY);
                this.laserBeam.displayHeight = dist; 
                this.laserBeam.displayWidth = 80;
                this.laserBeam.setVisible(true);

                

                // Cập nhật Đường thẳng Toán học (Dùng để quét sát thương AoE trong vòng lặp)
                this.laserLine.setTo(targetDroneX, 850, targetAimX, targetAimY);

                // --- JUICY EFFECTS (RUNG LẮC DRONE VÀ CHỚP SÁNG TIA LASER) ---
                this.cameras.main.shake(5000, 0.005); // Rung nhẹ màn hình liên tục 5 giây
                
                let laserTween = this.tweens.add({
                    targets: this.laserBeam, alpha: { from: 1, to: 0.4 }, yoyo: true, repeat: -1, duration: 100
                });

                let droneShake = this.tweens.add({
                    targets: this.droneSprite, x: targetDroneX + Phaser.Math.Between(-3, 3), y: 850 + Phaser.Math.Between(-3, 3), yoyo: true, repeat: -1, duration: 50
                });

                // --- SAU 5 GIÂY: TẮT LASER VÀ BAY VỀ CHỖ CŨ ---
                this.time.delayedCall(5000, () => {
                    this.isDroneFiring = false;
                    this.laserBeam.setVisible(false);
                    laserTween.stop();
                    droneShake.stop();
                    
                    this.droneSprite.rotation = 0; // Trả lại dáng thẳng đứng

                    // Lên đạn lại (Reset đồng hồ)
                    this.droneTimer = this.time.now + this.getDroneCooldown();

                    // Trả Drone về lơ lửng bên trái súng (X=150)
                    this.tweens.add({ targets: this.droneSprite, x: 150, y: 850, duration: 500, ease: 'Power1', onComplete: () => {
                        this.tweens.add({ targets: this.droneSprite, y: 840, yoyo: true, repeat: -1, duration: 800, ease: 'Sine.easeInOut' });
                    }});
                });
            }
        });
    }

    // --- HÀM XỬ LÝ BẮN THỦ CÔNG ---
    handleManualFire(pointer) {
        this.isManualFiring = true;

        // Lưu lại tọa độ Click để hàm update() bắn, tuyệt đối KHÔNG gọi fireBullet ở đây!
        this.manualTarget = { x: pointer.x, y: pointer.y };

        if (this.manualTimeoutEvent) {
            this.manualTimeoutEvent.remove();
        }

        this.manualTimeoutEvent = this.time.delayedCall(500, () => {
            this.isManualFiring = false;
            this.manualTarget = null; // Xóa mục tiêu thủ công khi trả quyền cho AI
        });
    }

    // --- HÀM SINH QUÁI BẦY ĐÀN (ĐÃ FIX OBJECT POOLING) ---
    spawnZombie() {
        let spawnCount = 1 + this.playerLevel; 

        for (let i = 0; i < spawnCount; i++) {
            let spawnX = Phaser.Math.Between(50, 490);
            let spawnY = Phaser.Math.Between(-100, -20); 

            // --- SỬA Ở ĐÂY: DÙNG HÀM get() ---
            let zombie = this.zombiePool.get(spawnX, spawnY);

            if (zombie) {
                zombie.setActive(true);
                zombie.setVisible(true);
                zombie.body.enable = true; // Bật lại vật lý
                
                zombie.hp = 20 * Math.pow(2, (this.playerLevel - 1)); 
                
                let baseSpeed = Phaser.Math.Between(50, 80);
                let currentSpeed = baseSpeed + (this.playerLevel * 5);
                
                this.physics.moveTo(zombie, spawnX, this.wall.y, currentSpeed);
            }
        }
    }

    // --- RADAR: TÌM CON QUÁI GẦN THÀNH NHẤT (CÓ Y LỚN NHẤT) ---
    findNearestZombie() {

         if (this.isManualFiring) {
            this.currentTarget = null;
            return;
        }
        
        let highestY = -999;
        let nearestZombie = null;

        // Quét tất cả quái vật ĐANG SỐNG trong Pool
        this.zombiePool.getChildren().forEach(zombie => {
            if (zombie.active && zombie.y > highestY) {
                highestY = zombie.y;
                nearestZombie = zombie;
            }
        });

        this.currentTarget = nearestZombie;
    }

    
   // --- SỰ KIỆN ĐẠN TRÚNG QUÁI CÓ TÍNH MÁU ---
    // --- SỰ KIỆN ĐẠN TRÚNG QUÁI (ĐÃ UPDATE HIỆU ỨNG ĐỎ & CHỮ NẨY) ---
   // --- SỰ KIỆN ĐẠN TRÚNG QUÁI (ĐÃ CẬP NHẬT KỸ NĂNG ROGUELIKE) ---
   // --- SỰ KIỆN ĐẠN TRÚNG QUÁI (ĐÃ FIX LỖI XUYÊN THẤU VÀ LAG) ---
   // --- SỰ KIỆN ĐẠN TRÚNG QUÁI (ĐÃ CỘNG DỒN SKILL MẠNH DẦN) ---
    handleBulletHitZombie(bullet, zombie) {
        if (!zombie.active || !bullet.active) return;
        if (bullet.hitTargets.includes(zombie.id)) return;

        bullet.hitTargets.push(zombie.id);

        // SÁT THƯƠNG GỐC CỦA ĐẠN (Mặc định là 10)
        let bulletDamage = 15; 
        
        this.applyDamageToZombie(zombie, bulletDamage);

        // 1. KỸ NĂNG NỔ LAN (Sức mạnh tăng theo Level)
        if (this.skills.explosive > 0) {
            // Sát thương nổ = 5 * Cấp kỹ năng (Lv1 = 5 dame, Lv2 = 10 dame...)
            let aoeDamage = this.skills.explosive * 10; 
            // Bán kính nổ = 60 + 15 * Cấp
            let aoeRadius = 60 + (this.skills.explosive * 20);
            
            this.triggerExplosionAoE(zombie.x, zombie.y, aoeDamage, aoeRadius); 
        }

        // 2. KỸ NĂNG XUYÊN THẤU (Số lượng xuyên tăng theo Level)
        let maxPierce = 0;
        if (this.skills.pierce > 0) {
            maxPierce = 4 + this.skills.pierce; // Lv1 = Xuyên 5 con, Lv2 = Xuyên 6 con...
        }

        // Nếu Đạn đã đâm trúng số lượng quái vượt quá sức chịu đựng xuyên thấu -> Tắt đạn!
        if (bullet.hitTargets.length > maxPierce) {
            bullet.setActive(false);
            bullet.setVisible(false);
            bullet.body.stop(); 
            bullet.setPosition(-999, -999);
            
            // XÓA SỔ ĐEN CỦA VIÊN ĐẠN NÀY SAU KHI NÓ CHẾT ĐỂ LẦN SAU BẮN LẠI KHÔNG BỊ LỖI
            bullet.hitTargets = []; 
        }
    }

    // --- XỬ LÝ KHI ĐẠN ĐẬP VÁCH TƯỜNG (Cập nhật góc xoay) ---
    handleBulletBounce(bullet, wall) {
        if (!bullet.active) return;

        if (bullet.bouncesLeft > 0) {
            bullet.bouncesLeft--;
            
            // Xoay hình ảnh viên đạn cho khớp với hướng nảy ra của Physics
            let newAngle = Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x);
            bullet.rotation = newAngle + Math.PI/2;
            
        } else {
            // Hết lượt nảy -> Biến mất!
            this.recycleBullet(bullet);
        }
    }

    // Cập nhật lại hàm triggerExplosionAoE để nhận bán kính động
    triggerExplosionAoE(x, y, aoeDamage, explosionRadius) {
        let blastRing = this.add.circle(x, y, explosionRadius, 0xe74c3c, 0.4).setDepth(4);
        this.tweens.add({
            targets: blastRing, scale: 1.5, alpha: 0, duration: 300,
            onComplete: () => blastRing.destroy()
        });

        this.zombiePool.getChildren().forEach(otherZombie => {
            if (otherZombie.active) {
                let dist = Phaser.Math.Distance.Between(x, y, otherZombie.x, otherZombie.y);
                if (dist <= explosionRadius) {
                    this.applyDamageToZombie(otherZombie, aoeDamage);
                }
            }
        });
    }
    
    // HÀM TIỆN ÍCH: TRỪ MÁU QUÁI VÀ KIỂM TRA CHẾT
    applyDamageToZombie(zombie, damage) {
        if (!zombie.active) return;

        zombie.hp -= damage;
        zombie.y -= 5; // Knockback

        this.showDamageText(zombie.x, zombie.y, damage);

        zombie.setTint(0xff0000);
        this.time.delayedCall(100, () => {
            if (zombie && zombie.active) zombie.clearTint(); 
        });

        // KIỂM TRA CHẾT
        if (zombie.hp <= 0) {
            let dropX = zombie.x;
            let dropY = zombie.y;

            zombie.setActive(false);
            zombie.setVisible(false);
            zombie.body.stop();
            zombie.setPosition(-999, -999); 
            zombie.clearTint(); 
            
            this.spawnExpGem(dropX, dropY);
        }
    }


   // --- SỰ KIỆN QUÁI CHẠM TƯỜNG (CẮN MÁU) - FIX LỖI TƯỜNG BIẾN MẤT ---
    handleZombieHitWall(obj1, obj2) {
        // PHÂN BIỆT RÕ RÀNG ĐÂU LÀ QUÁI, ĐÂU LÀ TƯỜNG BẰNG CÁCH CHECK NAME
        let zombie = null;
        let wall = null;

        if (obj1.name === 'zombie') zombie = obj1;
        else if (obj1 === this.wall) wall = obj1;

        if (obj2.name === 'zombie') zombie = obj2;
        else if (obj2 === this.wall) wall = obj2;

        // Nếu vì lý do nào đó không tìm thấy quái, hủy bỏ
        if (!zombie || !zombie.active) return;

        // Quái chạm tường -> Tự nổ để cắn máu tường
        zombie.setActive(false);
        zombie.setVisible(false);
        if (zombie.body) zombie.body.stop();
        zombie.setPosition(-999, -999);

        // Trừ máu tường (Mỗi con cắn mất 5 máu)
        this.wallHp -= 5;

        // Cập nhật giao diện thanh máu tường
        let ratio = Math.max(0, this.wallHp / this.wallMaxHp);
        this.tweens.add({ targets: this.wallHpFill, width: 200 * ratio, duration: 100 });
        this.wallHpText.setText(`${Math.max(0, this.wallHp)}/${this.wallMaxHp}`);
        
        // Đổi màu thanh máu sang đỏ nếu gần chết
        if (ratio < 0.3) {
            this.wallHpFill.setFillStyle(0xe74c3c);
            // Nháy đỏ màn hình báo hiệu Tường đang bị cắn
            this.cameras.main.flash(100, 255, 0, 0, 0.3);
        }

        // Bắn chữ trừ máu tường (Màu đỏ mận) bay lên từ giữa tường
        this.showDamageText(270, 780, 5, false, '#c0392b');

        // NẾU MÁU TƯỜNG <= 0 -> GAME OVER!
        if (this.wallHp <= 0 && !this.isGameOver) {
            this.isGameOver = true;
            this.triggerGameOver();
        }
    }

        update(time, delta) {
       // =======================================================
        // --- QUẢN LÝ ĐẠN BẰNG TOÁN HỌC (THU HỒI & NẢY TƯỜNG) ---
        // =======================================================
        this.bulletPool.getChildren().forEach(bullet => {
            if (!bullet.active) return;

            // 1. Nếu đạn bay ra khỏi trần nhà (Y < 0) hoặc lọt xuống đáy (Y > 1000) -> Hủy
            if (bullet.y < -50 || bullet.y > 1000) {
                this.recycleBullet(bullet);
                return;
            }

            // 2. LOGIC NẢY TƯỜNG TRÁI / PHẢI
            let isHitLeft = bullet.x <= 10;
            let isHitRight = bullet.x >= 530;

            if (isHitLeft || isHitRight) {
                // Nếu chưa có skill Nảy (bouncesLeft <= 0), cho bay xuyên luôn ra vũ trụ!
                if (bullet.bouncesLeft <= 0) {
                    if (bullet.x < -50 || bullet.x > 590) { // Đợi nó bay hẳn ra ngoài rồi thu hồi
                        this.recycleBullet(bullet);
                    }
                    return; 
                }

                // Nếu có skill Nảy: Ép nó lộn ngược vận tốc X
                bullet.bouncesLeft--;
                
                bullet.body.velocity.x *= -1; 
                
                // Đẩy viên đạn lùi lại 1 tẹo để không bị dính vào mép tường gây nảy liên tục 60 lần/giây
                if (isHitLeft) bullet.x = 15;
                if (isHitRight) bullet.x = 525;

                // Cập nhật lại góc xoay hình ảnh của viên đạn cho khớp với hướng bay mới
                let newAngle = Math.atan2(bullet.body.velocity.y, bullet.body.velocity.x);
                bullet.rotation = newAngle + Math.PI/2;
            }
        });

        // =======================================================
        // --- XỬ LÝ SÁT THƯƠNG DRONE LASER LIÊN TỤC (Tia Toán Học) ---
        // =======================================================
        if (this.hasDrone) {
            // Kiểm tra Cooldown: Nếu tới giờ mà chưa bắn, bắt đầu xả Laze
            if (time > this.droneTimer && !this.isDroneFiring) {
                this.fireDroneLaser();
            }

            // Nếu Laze đang phụt (Kéo dài 5s) -> Quét quái và thui rụi chúng!
            if (this.isDroneFiring) {
                // Sát thương tia laze tăng tiến khủng khiếp theo cấp Drone (Level 1: 5, Level 2: 10, Level 3: 15 / Frame)
                let laserDamage = this.droneLevel * 10; 

                this.zombiePool.getChildren().forEach(zombie => {
                    if (zombie.active) {
                        // Tạo một hình chữ nhật ảo bao quanh con quái
                        let zRect = new Phaser.Geom.Rectangle(zombie.x - 20, zombie.y - 20, 40, 40);
                        
                        // Dùng Toán Học siêu đẳng: Nếu Đường Laze cắt ngang Hình chữ nhật của con quái -> BÚNG MÁU!
                        if (Phaser.Geom.Intersects.LineToRectangle(this.laserLine, zRect)) {
                            this.applyDamageToZombie(zombie, laserDamage);
                            
                            // Tạo khói đỏ xì ra từ người con quái bị nướng
                            if (Math.random() < 0.2) { 
                                this.showDamageText(zombie.x + Phaser.Math.Between(-15,15), zombie.y, laserDamage, false, '#00ffff');
                            }
                        }
                    }
                });
            }
        }


        // ... (Phần Y-Sorting và TỔNG TƯ LỆNH SÚNG giữ nguyên) ...
        // =======================================================
        // --- THÊM MỚI: Y-SORTING (PHÂN LỚP ĐỒ HỌA CHIỀU SÂU) ---
        // Sắp xếp lại Depth của toàn bộ Quái vật đang sống dựa vào tọa độ Y.
        // Con nào đi xuống sâu hơn (Y lớn hơn) sẽ đè lên con ở trên (Y nhỏ hơn).
        // =======================================================
        this.zombiePool.setDepth(6); // Set độ sâu gốc của cả Pool
        this.children.depthSort();   // Lệnh tự động xếp lớp các children theo Y mặc định của Phaser (Nếu cấu hình Group cho phép)
        
        // CÁCH CHUẨN XÁC 100% CHO ARCADE GROUP:
        this.zombiePool.getChildren().forEach(zombie => {
            if (zombie.active) {
                // Tọa độ Y của zombie chạy từ 0 -> 800. 
                // Cộng thêm 100 để đảm bảo nó luôn nằm đè lên background (0) nhưng nằm dưới Tường (1000)
                zombie.setDepth(100 + Math.floor(zombie.y)); 
            }
        });
        // =======================================================

     // --- TỔNG TƯ LỆNH SÚNG (ĐÃ FIX COOLDOWN BẰNG DELTA TIME) ---
        let targetX = null;
        let targetY = null;

        // Trừ lùi thời gian đếm ngược của đạn (Nếu > 0 thì trừ dần bằng delta)
        if (this.weaponCooldown > 0) {
            this.weaponCooldown -= delta;
        }

        if (this.isManualFiring && this.manualTarget) {
            targetX = this.manualTarget.x;
            targetY = this.manualTarget.y;
        } else if (this.currentTarget && this.currentTarget.active) {
            targetX = this.currentTarget.x;
            targetY = this.currentTarget.y;
        }

        if (targetX !== null && targetY !== null) {
            let angleRad = Phaser.Math.Angle.Between(this.player.x, this.player.y, targetX, targetY);
            let angleDeg = Phaser.Math.RadToDeg(angleRad);

            if (angleDeg > 0) return; 

            let weaponKey = 'player_center';
            let rotationOffset = Math.PI / 2; 

            if (angleDeg >= -180 && angleDeg < -125) {
                weaponKey = 'player_left';
                rotationOffset = (Math.PI / 1.44); 
            } else if (angleDeg >= -125 && angleDeg <= -55) {
                weaponKey = 'player_center';
                rotationOffset = Math.PI / 2; 
            } else if (angleDeg > -55 && angleDeg <= 0) {
                weaponKey = 'player_right';
                rotationOffset = Math.PI / 3.27; 
            }

            if (this.textures.exists(weaponKey) && this.player.texture.key !== weaponKey) {
                this.player.setTexture(weaponKey);
            }

            this.player.rotation = angleRad + rotationOffset;

            // --- BÓP CÒ: Nếu Cooldown <= 0 thì nhả đạn! ---
            if (this.weaponCooldown <= 0) {
                this.fireBullet(targetX, targetY);
                // Reset lại Cooldown bằng đúng tốc độ bắn hiện tại
                this.weaponCooldown = this.fireRate; 
            }
        }
    }   

    // =======================================================
    // HỆ THỐNG RỚT VÀ HÚT KINH NGHIỆM
    // =======================================================
  spawnExpGem(x, y) {
        // Lấy hạt Exp từ Pool
        let gem = this.expPool.get(x, y);
        if (gem) {
            gem.setActive(true);
            gem.setVisible(true);
            
            // --- ĐÃ FIX: Đảm bảo hạt Exp đứng yên ngay lúc mới sinh ra ---
            gem.body.setVelocity(0, 0); 
            gem.body.stop();

            // Hiệu ứng nảy nhẹ
            this.tweens.add({ targets: gem, y: y - 20, yoyo: true, duration: 200, ease: 'Quad.easeOut' });

            // Nửa giây sau mới bắt đầu hút về người chơi
            this.time.delayedCall(500, () => {
                if (gem.active) {
                    this.physics.moveToObject(gem, this.player, 400); 
                }
            });
        }
    }

   collectExp(player, gem) {
        // --- ĐÃ FIX: Cờ bảo vệ chống ăn 2 lần trong 1 frame ---
        if (!gem.active) return;

        // Tắt hạt exp, DỪNG VẬN TỐC, và tống nó ra khỏi màn hình!
        gem.setActive(false);
        gem.setVisible(false);
        gem.body.setVelocity(0, 0); // Xóa sạch lực hút
        gem.body.stop();
        gem.setPosition(-999, -999); // Tống ra vũ trụ

        // CỘNG EXP VÀ CẬP NHẬT THANH BAR
        this.currentExp += 20; 
        
        let ratio = Math.min(1, this.currentExp / this.maxExp);
        this.tweens.add({ targets: this.expFill, width: 500 * ratio, duration: 100 });

        // KIỂM TRA LÊN CẤP
        if (this.currentExp >= this.maxExp) {
            this.triggerLevelUp();
        }
    }

    // =======================================================
    // DỪNG TRÒ CHƠI VÀ MỞ BẢNG CHỌN KỸ NĂNG (ROGUELIKE)
    // =======================================================
    triggerLevelUp() {
        // 1. Tăng Level và Cài đặt lại Exp cho cấp tiếp theo (Công thức khó dần)
        this.playerLevel++;
        this.currentExp -= this.maxExp;
        this.maxExp = Math.floor(this.maxExp * 1.5); 
        this.levelText.setText(`LV. ${this.playerLevel}`);
        
        let ratio = Math.min(1, this.currentExp / this.maxExp);
        this.expFill.width = 500 * ratio;   

        // 2. PAUSE TOÀN BỘ CÁC BỘ ĐẾM THỜI GIAN VÀ VẬT LÝ
        this.physics.pause();
        this.time.paused = true; // Dừng luôn việc sinh quái và bắn súng

        // 3. VẼ POPUP CHỌN KỸ NĂNG NỔI LÊN TRÊN (Sẽ làm ở Bước 4)
        this.showSkillSelectionPopup();
    }

    // --- HÃY DÁN HÀM NÀY VÀO TRƯỚC DẤU ĐÓNG CLASS ---
    showSkillSelectionPopup() {
        let bgMask = this.add.rectangle(270, 480, 540, 960, 0x000000, 0.8).setDepth(2000).setInteractive();
        let title = this.add.text(270, 200, "LÊN CẤP! CHỌN KỸ NĂNG", { font: 'bold 36px Arial', fill: '#f1c40f', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(2001);

        // KHO KỸ NĂNG ĐỘNG (Dựa vào cấp độ người chơi và cấp kỹ năng hiện tại)
        let availableSkills = [
            { id: 'rapid_fire', name: `TỐC BẮN (Lv.${this.skills.rapid_fire + 1})`, desc: "Giảm thời gian hồi đạn", color: 0x3498db },
            { id: 'explosive', name: `ĐẠN NỔ (Lv.${this.skills.explosive + 1})`, desc: "Tăng sát thương và bán kính nổ lan", color: 0xe74c3c },
            { id: 'pierce', name: `XUYÊN THẤU (Lv.${this.skills.pierce + 1})`, desc: `Đạn xuyên thêm 1 mục tiêu`, color: 0x9b59b6 }
        ];

        // TỪ LEVEL 5 TRỞ LÊN: Mở khóa các kỹ năng Tối Thượng
        if (this.playerLevel >= 5) {
            availableSkills.push({ id: 'multi_shot', name: `ĐA TIA (Lv.${this.skills.multi_shot + 1})`, desc: "Bắn thêm đạn cùng lúc", color: 0xf39c12 });
            availableSkills.push({ id: 'bounce', name: `NẢY TƯỜNG (Lv.${this.skills.bounce + 1})`, desc: "Đạn nảy lại khi chạm tường", color: 0x2ecc71 });
            
            if (!this.hasDrone) {
                availableSkills.push({ id: 'drone', name: "DRONE LASER", desc: "Triệu hồi Drone xả Laser", color: 0x00bcd4 });
            }
        }

        // Đảo ngẫu nhiên mảng và bốc ra đúng 3 kỹ năng
        Phaser.Utils.Array.Shuffle(availableSkills);
        let choices = availableSkills.slice(0, 3);
        
        let buttons = [];

        choices.forEach((skill, index) => {
            let py = 350 + (index * 150);

            let card = this.add.rectangle(270, py, 400, 100, skill.color).setStrokeStyle(4, 0xffffff).setInteractive({ useHandCursor: true }).setDepth(2001);
            let sName = this.add.text(100, py - 15, skill.name, { font: 'bold 24px Arial', fill: '#fff' }).setDepth(2002);
            let sDesc = this.add.text(100, py + 20, skill.desc, { font: '16px Arial', fill: '#ddd' }).setDepth(2002);
            
            buttons.push(card, sName, sDesc);

            card.on('pointerdown', () => {
                
                // --- XỬ LÝ NÂNG CẤP CỘNG DỒN KỸ NĂNG ---
                if (skill.id === 'drone') {
                    this.hasDrone = true;
                    this.activateDrone();
                } else {
                    this.skills[skill.id]++; // Tăng cấp kỹ năng lên 1
                }

                if (skill.id === 'rapid_fire') {
                    this.fireRate = Math.max(100, this.fireRate - 100); 
                } 

                // Dọn dẹp Popup
                bgMask.destroy();
                title.destroy();
                buttons.forEach(b => b.destroy());

                this.physics.resume();
                this.time.paused = false;
            });
        });
    }
    // =======================================================
    // HÀM TIỆN ÍCH: BẮN CHỮ SÁT THƯƠNG TỪ POOL
    // =======================================================
    showDamageText(x, y, damage) {
        // Lấy 1 đối tượng Text tàng hình từ Pool ra
        let txt = this.dmgTextPool.getFirstDead(false);

        if (!txt) {
            // Nếu Pool thiếu, đẻ thêm 1 cái (chỉ xảy ra khi bắn quá rát)
            txt = this.add.text(0, 0, '', { font: 'bold 22px Arial', fill: '#ffeb3b', stroke: '#000', strokeThickness: 4 }).setOrigin(0.5).setDepth(100);
            this.dmgTextPool.add(txt);
        }

        // Hồi sinh Text
        txt.setText(`-${damage}`);
        txt.setPosition(x, y - 20); // Bắt đầu nẩy từ trên đỉnh đầu con quái
        txt.setAlpha(1);
        txt.setActive(true);
        txt.setVisible(true);

        // Hiệu ứng bay lên và mờ dần trong 0.5s
        this.tweens.add({
            targets: txt,
            y: y - 60, // Bay cao lên
            alpha: 0,  // Mờ dần
            duration: 500,
            ease: 'Cubic.easeOut',
            onComplete: () => {
                // Tái chế: Ẩn đi để lần sau gọi lại (KHÔNG DESTROY)
                txt.setActive(false);
                txt.setVisible(false);
            }
        });
    }
// --- KẾT THÚC TRÒ CHƠI ---
    triggerGameOver() {
        this.physics.pause();
        this.time.paused = true; // Dừng mọi thứ lại
        
        let bgMask = this.add.rectangle(270, 480, 540, 960, 0x000000, 0.8).setDepth(2000).setInteractive();
        this.add.text(270, 400, "THÀNH TRÌ ĐÃ THẤT THỦ!", { font: 'bold 36px Arial', fill: '#e74c3c', stroke: '#000', strokeThickness: 5 }).setOrigin(0.5).setDepth(2001);
        
        this.add.text(270, 460, `Bạn đã sống sót đến Cấp ${this.playerLevel}`, { font: '24px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2001);

        let restartBtn = this.add.rectangle(270, 550, 200, 60, 0x3498db).setInteractive({ useHandCursor: true }).setDepth(2001);
        this.add.text(270, 550, "CHƠI LẠI", { font: 'bold 24px Arial', fill: '#fff' }).setOrigin(0.5).setDepth(2002);

        restartBtn.on('pointerdown', () => {
            this.scene.restart();
        });
    }

    recycleBullet(bullet) {
        bullet.setActive(false);
        bullet.setVisible(false);
        bullet.body.stop();
        bullet.setPosition(-999, -999);
        bullet.hitTargets = [];
    }

}