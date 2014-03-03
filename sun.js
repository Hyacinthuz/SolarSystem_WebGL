var sunTexture;
var sunHaloTexture;
var sunHaloColorTexture;
var sunCoronaTexture;

function loadStarSurfaceTextures(){
	if( sunTexture === undefined ){
		sunTexture = THREE.ImageUtils.loadTexture( "images/sun_surface.png", undefined, setLoadMessage("Igniting solar plasma") );
		sunTexture.anisotropy = maxAniso;
		sunTexture.wrapS = sunTexture.wrapT = THREE.RepeatWrapping;
	}
	
	if( sunHaloTexture === undefined ){
		sunHaloTexture = THREE.ImageUtils.loadTexture( "images/sun_halo.png", undefined, setLoadMessage("Calculating coronal mass") );
	}

	if( sunCoronaTexture === undefined ){
		sunCoronaTexture = THREE.ImageUtils.loadTexture( "images/sun_corona.png", undefined, setLoadMessage("Projecting coronal ejecta") );
	}
}

var surfaceGeo = new THREE.SphereGeometry( 7.35144e-8, 60, 30);
function makeStarSurface( radius, uniforms ){
	var sunShaderMaterial = new THREE.ShaderMaterial( {
		uniforms: 		uniforms,
		vertexShader:   shaderList.starsurface.vertex,
		fragmentShader: shaderList.starsurface.fragment,
	});

	var sunSphere = new THREE.Mesh( surfaceGeo, sunShaderMaterial);
	return sunSphere;
}

var haloGeo = new THREE.PlaneGeometry( .00000022, .00000022 );
function makeStarHalo(uniforms){
	var sunHaloMaterial = new THREE.ShaderMaterial(
		{
			uniforms: 		uniforms,
			vertexShader:   shaderList.starhalo.vertex,
			fragmentShader: shaderList.starhalo.fragment,
			blending: THREE.AdditiveBlending,
			depthTest: 		false,
			depthWrite: 	false,
			color: 0xffffff,
			transparent: true,
			//	settings that prevent z fighting
			polygonOffset: true,
			polygonOffsetFactor: 1,
			polygonOffsetUnits: 100,
		}
	);

	var sunHalo = new THREE.Mesh( haloGeo, sunHaloMaterial );
	sunHalo.position.set( 0, 0, 0 );
	return sunHalo;
}

var glowGeo = new THREE.PlaneGeometry( .0000012, .0000012 );
function makeStarGlow(uniforms){
	//	the bright glow surrounding everything
	var sunGlowMaterial = new THREE.ShaderMaterial(
		{
			//map: sunCoronaTexture,
			uniforms: 		uniforms,
			blending: THREE.AdditiveBlending,
			fragmentShader: shaderList.corona.fragment,
			vertexShader:   shaderList.corona.vertex,
			color: 0xffffff,
			transparent: true,
			//	settings that prevent z fighting
			polygonOffset: true,
			polygonOffsetFactor: -1,
			polygonOffsetUnits: 100,
			depthTest: true,
			depthWrite: true,
		}
	);

	var sunGlow = new THREE.Mesh( glowGeo, sunGlowMaterial );
	sunGlow.position.set( 0, 0, 0 );
	return sunGlow;
}


function makeSun( options ){
	var radius = options.radius;
	var spectral = options.spectral;

  // console.time("load sun textures"); 
	loadStarSurfaceTextures();
  // console.timeEnd("load sun textures");

	var sunUniforms = {
		texturePrimary:   { type: "t", value: sunTexture },
		//textureColor:   { type: "t", value: sunColorLookupTexture },
		textureSpectral: { type: "t", value: starColorGraph },
		time: 			{ type: "f", value: 0 },
		spectralLookup: { type: "f", value: 0 },		
	};

	var coronaUniforms = {
		texturePrimary:   { type: "t", value: sunCoronaTexture },
		textureSpectral: { type: "t", value: starColorGraph },
		spectralLookup: { type: "f", value: 0 },			
	};	

	//	container
	var sun = new THREE.Object3D();

	//	the actual glowy ball of fire
  // console.time("make sun surface");
	var starSurface = makeStarSurface( radius, sunUniforms );
	sun.add( starSurface );
  // console.timeEnd("make sun surface");

  	//	2D overlay elements	
	var gyro = new THREE.Gyroscope();
	sun.add( gyro );	
		sun.gyro = gyro;

	//	the corona that lines the edge of the sun sphere
    // console.time("make sun halo");
		var starHalo = makeStarHalo( haloUniforms );
		gyro.add( starHalo );
    // console.timeEnd("make sun halo");
	
    // console.time("make sun glow");
		var starGlow = makeStarGlow( coronaUniforms );
		gyro.add( starGlow );
    // console.timeEnd("make sun glow");


	var latticeMaterial = new THREE.MeshBasicMaterial({
		map: glowSpanTexture,
		blending: THREE.AdditiveBlending,
		transparent: true,
		depthTest: true,
		depthWrite: true,		
		wireframe: true,
		opacity: 0.8,
	});

	var lattice = new THREE.Mesh( new THREE.IcosahedronGeometry( radius * 1.25, 2), latticeMaterial );
	lattice.update = function(){
		this.rotation.y += 0.001;
		this.rotation.z -= 0.0009;
		this.rotation.x -= 0.0004;
	}
	lattice.material.map.wrapS = THREE.RepeatWrapping;
	lattice.material.map.wrapT = THREE.RepeatWrapping;
	lattice.material.map.needsUpdate = true;
	lattice.material.map.onUpdate = function(){
		this.offset.y -= 0.01;
		this.needsUpdate = true;
	}

	sun.add(lattice);

	sun.sunUniforms = sunUniforms;
	sun.haloUniforms = haloUniforms;
	sun.coronaUniforms = coronaUniforms;

	// sun.rotation.z = -0.93;
	// sun.rotation.y = 0.2;

	sun.setSpectralIndex = function( index ){
		var starColor = map( index, -0.3, 1.52, 0, 1);	
		starColor = constrain( starColor, 0.0, 1.0 );
		this.starColor = starColor;

		this.sunUniforms.spectralLookup.value = starColor;
		this.coronaUniforms.spectralLookup.value = starColor;	
	}
	sun.setSpectralIndex( spectral );

	sun.update = function(){
		this.sunUniforms.time.value = shaderTiming;
		this.haloUniforms.time.value = shaderTiming + rotateYAccumulate;
	}		

	//	test controls

	var c = gui.add( sunUniforms.spectralLookup, 'value', -.25, 1.5 );
	c.onChange( function(v){
		sun.setSpectralIndex( v );
	});

	//	doesn't work
	// var c = gui.add( sunUniforms.texturePrimary.value.repeat, 'x', 0.2, 100.0 )
	// .name( 'sun texture repeat')
	// .onChange( function(v){
	// 	sunUniforms.texturePrimary.value.repeat.y = v;
	// 	sunUniforms.texturePrimary.value.needsUpdate = true;
	// });	
	


	return sun;
}