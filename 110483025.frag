// Author:CMH
// Title:BreathingGlow+noise

#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;

float glow(float d, float str, float thickness){
    return thickness / pow(d, str);
}

vec2 hash2( vec2 x )            //亂數範圍 [-1,1]
{
    const vec2 k = vec2( 0.3183099, 0.3678794 );
    x = x*k + k.yx;
    return -1.0 + 2.0*fract( 16.0 * k*fract( x.x*x.y*(x.x+x.y)) );
}
float gnoise( in vec2 p )       //亂數範圍 [-1,1]
{
    vec2 i = floor( p );
    vec2 f = fract( p );
    
    vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( dot( hash2( i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ), 
                            dot( hash2( i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                         mix( dot( hash2( i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ), 
                            dot( hash2( i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
}

#define Use_Perlin
//#define Use_Value
float noise( in vec2 p )        //亂數範圍 [-1,1]
{
#ifdef Use_Perlin    
return gnoise(p);   //gradient noise
#elif defined Use_Value
return vnoise(p);       //value noise
#endif    
return 0.0;
}
float fbm(in vec2 uv)       //亂數範圍 [-1,1]
{
    float f;                                                //fbm - fractal noise (4 octaves)
    mat2 m = mat2( 1.6,  1.2, -1.2,  1.6 );
    f   = 0.5000*noise( uv ); uv = m*uv;          
    f += 0.2500*noise( uv ); uv = m*uv;
    f += 0.1250*noise( uv ); uv = m*uv;
    f += 0.0625*noise( uv ); uv = m*uv;
    return f;
}

float sdHexagram( in vec2 p, in float r )
{
    const vec4 k = vec4(-0.788,1.242,1.185,1.7320508076);
    p = abs(p);
    p -= 2.0*min(dot(k.xy,p),0.0)*k.xy;
    p -= 2.0*min(dot(k.yx,p),0.0)*k.yx;
    p -= vec2(clamp(p.x,r*k.z,r*k.w),r);
    return length(p)*sign(p.y);
}


void main() {
    vec2 uv = gl_FragCoord.xy/u_resolution.xy;
    uv.x *= u_resolution.x/u_resolution.y;
    uv= uv*2.0-1.0;
    
     uv *= 2.0;//(2)變4倍 16個
    uv = fract(uv);//重複(1)
    uv -=0.5;//(3)改變中點
    
    //陰晴圓缺
    float pi=3.14159;
    float theta=1.760*pi*u_time/8.0;
    vec2 point=vec2(sin(theta), cos(theta));
    float dir= dot(point, (uv))+0.798;
    
    //亂數作用雲霧
    float fog= fbm(0.4*uv+vec2(-0.1*u_time, -0.02*u_time))*0.6+0.1;

    //定義圓環
    float dist = length(uv);
    float circle_dist = abs(dist-0.024);                                //光環大小（半徑） abs：凸顯輪廓線
    
    float result = 0.0;
      for(int index=0; index<9; ++index)     //迴圈
    {
        //model
        float weight=smoothstep(uv.y, -0.592, -0.412);    //漸層   //可移動位置
          float freq=8.0+float(index)*0.260;                     //每次迴圈都有差異
        float noise=gnoise(uv*freq)*-0.150*weight;  //影響範圍 抖動程度、外型變化程度（low/high frequency）
        float model_dist=abs(sdHexagram(uv, 0.3)+noise); //對所有範圍做noise
            //abs(sdStar5(uv, 0.672, 0.420));  //星星（替換其他模型）

        //動態呼吸
        float breathing=sin(2.0*u_time/5.0*pi)*0.5+0.560;                     //option1
        //float breathing=(exp(sin(u_time/2.0*pi)) - 0.36787944)*0.42545906412;         //option2 錯誤
         //float breathing=(exp(sin(u_time/2.0*pi)) - 0.36787944)*0.42545906412;                //option2 正確
        float strength =(0.1*breathing+0.268);          //[0.2~0.3]         //光暈強度加上動態時間營造呼吸感
        float thickness=(0.1*breathing+0.084);          //[0.1~0.2]         //光環厚度 營造呼吸感
        float glow_circle = glow(model_dist, strength, thickness);
          
        result += glow_circle;     //+:過度曝光，調整strength
      }
    gl_FragColor = vec4((vec3(result)+fog)*dir*vec3(0.554,0.933,1.000)*0.116,0.896);
}



