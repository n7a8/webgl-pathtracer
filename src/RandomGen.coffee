class RandomGen
    @RANDOM_DATA_LENGTH = 1 << 12


    constructor: (@gl) ->
        @randomData = new Float32Array(RandomGen.RANDOM_DATA_LENGTH)


    createRandomData: ->
        for index in [0...@randomData.length]
            @randomData[index] = Math.random()

        if @randomDataTex? then @randomDataTex.destroy()
        @randomDataTex = new DataTexture(@gl, @gl.FLOAT, @randomData)


    bind: (program) ->
        @randomDataTex.bind(@gl.TEXTURE3)

        @gl.uniform1i(program.uniforms["randomBufferSampler"], 3)
        @gl.uniform2uiv(program.uniforms["randomBufferAddrData"],
            @randomDataTex.dataMaskAndShift)
