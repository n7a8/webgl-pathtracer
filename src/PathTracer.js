class PathTracer {
    async init() {
        this.createContext();
        await this.createShader();
        this.createVertexData();
        this.reset();

        this.randomGen = new RandomGen(this.gl);
        this.frameBuf = null;
    }

    createContext() {
        // Disable features that intefere with pixel transfer operations
        // or are not needed
        const attribs = {
            antialias: false,
            depth:     false,
            stencil:   false,
            alpha:     false
        };

        const canvas = document.createElement("canvas");
        this.gl = canvas ? canvas.getContext("webgl2", attribs) : null;

        if(!this.gl) {
            throw new Error("Unable to create WebGl2 context");
        }

        this.gl.depthMask(false);
        this.gl.clearColor(0, 0, 0, 0);
    }

    async createShader() {
        const fetchShader = filename => fetch("shaders/" + filename).then(r => r.text());

        const fetchShaders = async filenames => {
            const sources = await Promise.all(filenames.map(fetchShader));
            return sources.reduce((a, b) => a + b);
        }
        const vertexSource = await fetchShaders([
            "Setup.glsl",
            "Vertex.glsl"
        ]);
        const fragmentSource = await fetchShaders([
            "Setup.glsl",
            "Uniforms.glsl",
            "GeomTypes.glsl",
            "KDTree.glsl",
            "Material.glsl",
            "DataTex.glsl",
            "Random.glsl",
            "GeomHitTest.glsl",
            "SceneHitTest.glsl",
            "Scatter.glsl",
            "PathTrace.glsl",
            "Fragment.glsl"
        ]);
        const uniformData = await fetch("shaders/Uniforms.json").then(r => r.json());

        const sourcesData = [
            [this.gl.VERTEX_SHADER, vertexSource],
            [this.gl.FRAGMENT_SHADER, fragmentSource]
        ];
        this.program = new ShaderProgram(this.gl, sourcesData, uniformData, ["vertPos"]);
    }

    createVertexData() {
        this.vbo = new Buffer(this.gl, new Float32Array(
            [-1, -1, -1, +1, +1, +1, +1, +1, +1, -1, -1, -1]
        ));
        this.vao = new VertexArray(this.gl);
        this.vao.setupAttrib(this.program.uniforms.vertPos, this.vbo, 2, this.gl.FLOAT);
    }

    reset() {
        this.sampleCounter = 0;
    }

    setResolution(frameRes) {
        this.frameRes = frameRes;
        this.frameBounds = [0, 0, this.frameRes.x, this.frameRes.y];
        const canvas = this.gl.canvas;
        [canvas.width, canvas.height] = this.frameRes.array();
        this.gl.viewport(...this.frameBounds);

        if(this.frameBuf) {
            this.frameBuf.destroy();
        }
        this.frameBuf = new Framebuffer(this.gl, this.frameRes);

        this.reset();
    }

    setJitter() {
        const jitter = new Vec2()
            .map(Math.random)
            .scale(2)
            .sub(new Vec2(1, 1))
            .div(this.frameRes)
            .array();

        this.gl.uniform2fv(this.program.uniforms.subPixelJitter, jitter);
    }

    setAlpha() {
        // Compute alpha to be used as a weight in the running average
        const alpha = 1 / (this.sampleCounter + 1);
        this.gl.uniform1f(this.program.uniforms.compositeAlpha, alpha);
    }

    renderImage(scene) {
        const gl = this.gl;

        this.program.use();

        this.randomGen.createRandomData();
        this.randomGen.bind(this.program);
        scene.bind(this.program);

        this.setJitter();
        this.setAlpha();

        this.sampleCounter++;

        // Render to output framebuffer
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, this.frameBuf.buf);
        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.frameBuf.buf);

        // Composite samples with additive blending
        gl.enable(gl.BLEND);
        gl.blendFuncSeparate(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA, gl.ONE, gl.ONE);

        // Render
        this.vao.bind();
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        gl.finish();
    }

    displayImage() {
        const gl = this.gl;

        gl.bindFramebuffer(gl.READ_FRAMEBUFFER, this.frameBuf.buf);
        gl.bindFramebuffer(gl.DRAW_FRAMEBUFFER, null);

        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.blitFramebuffer(
            ...this.frameBounds,
            ...this.frameBounds,
            gl.COLOR_BUFFER_BIT,
            gl.NEAREST
        );
    }
}
