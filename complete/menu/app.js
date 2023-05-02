import * as THREE from '../../libs/three/three.module.js';
import { GLTFLoader } from '../../libs/three/jsm/GLTFLoader.js';
import { Stats } from '../../libs/stats.module.js';
import { ARButton } from '../../libs/ARButton.js';
import { LoadingBar } from '../../libs/LoadingBar.js';
import { Player } from '../../libs/Player.js';
import { ControllerGestures } from '../../libs/ControllerGestures.js';

class App{
	constructor(){
		const container = document.createElement( 'div' );
		document.body.appendChild( container );

        this.assetsPath = '../../assets/';
        this.loadingBar = new LoadingBar();
        
        this.clock = new THREE.Clock();
        
		this.camera = new THREE.PerspectiveCamera( 70, window.innerWidth / window.innerHeight, 0.01, 20 );
		
		this.scene = new THREE.Scene();
       
		this.scene.add( new THREE.HemisphereLight( 0x606060, 0x404040 ) );

        const light = new THREE.DirectionalLight( 0xffffff );
        light.position.set( 1, 1, 1 ).normalize();
		this.scene.add( light );
			
		this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true } );
		this.renderer.setPixelRatio( window.devicePixelRatio );
		this.renderer.setSize( window.innerWidth, window.innerHeight );
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
		container.appendChild( this.renderer.domElement );
        
        this.stats = new Stats();
        
        this.initScene();
        this.setupXR();
        
        window.addEventListener('resize', this.resize.bind(this) );
	}	

    loadPlate(){
        const loader = new GLTFLoader().setPath(this.assetsPath);
		const self = this;

        // Load a GLTF resource
		loader.load(
			// resource URL
			`sandwich.glb`,
			// called when the resource is loaded
			function ( gltf ) {
				const object = gltf.scene.children[5];
				
				object.traverse(function(child){
					if (child.isMesh){
                        child.material.metalness = 0;
                        child.material.roughness = 1;
					}
				});
				
				const options = {
					object: object,
					speed: 0.5,
					animations: gltf.animations,
					clip: gltf.animations[0],
					app: self,
					name: 'knight',
					npc: false
				};
				
				self.knight = new Player(options);
                self.knight.object.visible = false;
				
				const scale = 0.003;
				self.knight.object.scale.set(scale, scale, scale); 
				
                self.loadingBar.visible = false;
			},
			// called while loading is progressing
			function ( xhr ) {

				self.loadingBar.progress = (xhr.loaded / xhr.total);

			},
			// called when loading has errors
			function ( error ) {

				console.log( 'An error happened' );

			}
		);
    }
    
    initScene(){
        this.loadPlate(); 

        this.reticle = new THREE.Mesh(
            new THREE.RingBufferGeometry( 0.15, 0.2, 32 ).rotateX( - Math.PI / 2 ),
            new THREE.MeshBasicMaterial()
        );
        
        this.reticle.matrixAutoUpdate = false;
        this.reticle.visible = false;
        this.scene.add( this.reticle );        
    }
    
    setupXR(){
        this.renderer.xr.enabled = true; 
        
        const btn = new ARButton( this.renderer, { sessionInit: { requiredFeatures: [ 'hit-test' ], optionalFeatures: [ 'dom-overlay' ], domOverlay: { root: document.body } } } );

        const self = this;

        this.hitTestSourceRequested = false;
        this.hitTestSource = null;

        // function onSelect() {
        //     if (self.knight===undefined) return;
            
        //     if (self.reticle.visible){
        //         if (self.knight.object.visible){
        //             self.workingVec3.setFromMatrixPosition( self.reticle.matrix );
        //             self.knight.newPath(self.workingVec3);
        //         }else{
        //             self.knight.object.position.setFromMatrixPosition( self.reticle.matrix );
        //             self.knight.object.visible = true;
        //         }
        //     }
        // }

        // this.controller = this.renderer.xr.getController( 0 );
        // this.controller.addEventListener( 'select', onSelect );
        
        // this.scene.add( this.controller ); 
        
        this.gestures = new ControllerGestures( this.renderer );
        this.gestures.addEventListener( 'tap', (ev)=>{
            console.log( 'tap' ); 

            if (self.knight===undefined) return;
            
            if (self.reticle.visible){
                if (!self.knight.object.visible){
                    self.knight.object.visible = true;
                    self.knight.object.position.set( 0, -0.3, -0.5 ).add( ev.position );
                    self.scene.add( self.knight.object ); 
                }
            }
        });
        this.gestures.addEventListener( 'doubletap', (ev)=>{
            console.log( 'doubletap'); 
        });
        this.gestures.addEventListener( 'press', (ev)=>{
            console.log( 'press' );    
        });
        this.gestures.addEventListener( 'pan', (ev)=>{
            //console.log( ev );
            if (ev.initialise !== undefined){
                self.startPosition = self.knight.object.position.clone();
            }else{
                const pos = self.startPosition.clone().add( ev.delta.multiplyScalar(3) );
                self.knight.object.position.copy( pos );
            } 
        });
        this.gestures.addEventListener( 'swipe', (ev)=>{
            console.log( ev );   
            if (self.knight.object.visible){
                self.knight.object.visible = false;
                self.scene.remove( self.knight.object ); 
            }
        });
        this.gestures.addEventListener( 'pinch', (ev)=>{
            console.log( ev );  
            if (ev.initialise !== undefined){
                self.startScale = self.knight.object.scale.clone();
            }else{
                const scale = self.startScale.clone().multiplyScalar(ev.scale);
                self.knight.object.scale.copy( scale );
            }
        });
        this.gestures.addEventListener( 'rotate', (ev)=>{
                 sconsole.log( ev ); 
            if (ev.initialise !== undefined){
                self.startQuaternion = self.knight.object.quaternion.clone();
            }else{
                self.knight.object.quaternion.copy( self.startQuaternion );
                self.knight.object.rotateY( ev.theta );
            }
        });
        
        this.renderer.setAnimationLoop( this.render.bind(this) );
    }
    
    resize(){
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize( window.innerWidth, window.innerHeight );  
    }

    requestHitTestSource(){
        const self = this;
        
        const session = this.renderer.xr.getSession();

        session.requestReferenceSpace( 'viewer' ).then( function ( referenceSpace ) {
            
            session.requestHitTestSource( { space: referenceSpace } ).then( function ( source ) {

                self.hitTestSource = source;

            } );

        } );

        session.addEventListener( 'end', function () {

            self.hitTestSourceRequested = false;
            self.hitTestSource = null;
            self.referenceSpace = null;

        } );

        this.hitTestSourceRequested = true;

    }
    
    getHitTestResults( frame ){
        const hitTestResults = frame.getHitTestResults( this.hitTestSource );

        if ( hitTestResults.length ) {
            
            const referenceSpace = this.renderer.xr.getReferenceSpace();
            const hit = hitTestResults[ 0 ];
            const pose = hit.getPose( referenceSpace );

            this.reticle.visible = true;
            this.reticle.matrix.fromArray( pose.transform.matrix );

        } else {

            this.reticle.visible = false;

        }

    }
    
	render( timestamp, frame ) {   
        this.stats.update();

        const self = this;

        if ( frame ) {

            if ( this.hitTestSourceRequested === false ) this.requestHitTestSource( )

            if ( this.hitTestSource ) this.getHitTestResults( frame );

        }

        this.renderer.render( this.scene, this.camera );
    }
}

export { App };