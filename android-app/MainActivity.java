package com.kokabfodool.shell;
import android.app.Activity;
import android.os.Bundle;
import android.webkit.*;
import android.net.Uri;
import android.graphics.Color;
import android.view.ViewGroup;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Button;
import android.widget.Toast;
import java.io.*;
import java.util.*;
public class MainActivity extends Activity {
    private WebView web;
    private boolean offline;
    private String host;
    private String home;
    @Override public void onCreate(Bundle state){
        super.onCreate(state);
        offline=getPackageName().endsWith(".offline");
        host=offline?"appassets.androidplatform.net":"kokabfodool.com";
        home="https://"+host+"/play-app/";
        getWindow().setStatusBarColor(Color.rgb(73,48,143));
        getWindow().setNavigationBarColor(Color.WHITE);
        web=new WebView(this);
        web.setBackgroundColor(Color.rgb(248,246,255));
        WebSettings s=web.getSettings();
        s.setJavaScriptEnabled(true);s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);s.setAllowContentAccess(false);
        s.setAllowFileAccessFromFileURLs(false);s.setAllowUniversalAccessFromFileURLs(false);
        s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        s.setJavaScriptCanOpenWindowsAutomatically(false);s.setSupportMultipleWindows(false);
        s.setMediaPlaybackRequiresUserGesture(true);s.setUserAgentString(s.getUserAgentString()+(offline?" FudoolAndroidOffline":" FudoolAndroidOnline"));
        if(offline)s.setBlockNetworkLoads(true);
        CookieManager.getInstance().setAcceptThirdPartyCookies(web,false);
        web.setWebChromeClient(new WebChromeClient());
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest req){
                Uri u=req.getUrl();String p=u.getPath();
                if("https".equals(u.getScheme())&&host.equals(u.getHost())&&allowedPage(p))return false;
                if(req.isForMainFrame())Toast.makeText(MainActivity.this,"هذه النسخة مخصصة للألعاب | Games edition",Toast.LENGTH_SHORT).show();
                return true;
            }
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest req){
                Uri u=req.getUrl();
                if(!"https".equals(u.getScheme())||!host.equals(u.getHost()))return error(403,"Blocked");
                if(!offline)return null;
                return local(u,req.getRequestHeaders());
            }
            @Override public void onReceivedError(WebView view,WebResourceRequest req,WebResourceError e){
                if(req.isForMainFrame()&&!offline)runOnUiThread(()->showRetry());
            }
        });
        setContentView(web);
        if(state==null)web.loadUrl(home);else if(web.restoreState(state)==null)web.loadUrl(home);
    }
    private boolean allowedPage(String p){
        if(p==null)return false;
        return p.equals("/")||p.equals("/en/")||p.matches("^/(en/)?(play-app|games|app|privacy)(/.*)?$");
    }
    private void showRetry(){
        LinearLayout box=new LinearLayout(this);box.setOrientation(LinearLayout.VERTICAL);box.setPadding(32,64,32,32);
        TextView text=new TextView(this);text.setText("تحتاج نسخة أونلاين إلى الإنترنت.\nThe online edition needs an internet connection.");text.setTextSize(20);
        Button b=new Button(this);b.setText("إعادة المحاولة | Retry");b.setOnClickListener(v->{setContentView(web);web.loadUrl(home);});
        box.addView(text);box.addView(b);setContentView(box);
    }
    private static WebResourceResponse error(int code,String message){
        return new WebResourceResponse("text/plain","UTF-8",code,message,Collections.emptyMap(),new ByteArrayInputStream(message.getBytes(java.nio.charset.StandardCharsets.UTF_8)));
    }
    private WebResourceResponse local(Uri u,Map<String,String> headers){
        String p=u.getPath();if(p==null||p.contains("..")||p.contains("\\")||p.indexOf('\0')>=0)return error(403,"Blocked");
        if(p.endsWith("/"))p+="index.html";if(p.startsWith("/"))p=p.substring(1);
        if(!(p.startsWith("assets/")||allowedPage("/"+p.replace("index.html",""))||p.equals("manifest.webmanifest")))return error(404,"Not Found");
        String mime=mime(p);String encoding=mime.startsWith("text/")||mime.contains("javascript")||mime.contains("json")||mime.contains("svg")?"UTF-8":null;
        try{
            InputStream stream=getAssets().open("site/"+p);
            Map<String,String> response=new HashMap<>();response.put("Cache-Control","no-store");response.put("Accept-Ranges","bytes");
            String range=null;for(Map.Entry<String,String> h:headers.entrySet())if(h.getKey().equalsIgnoreCase("range"))range=h.getValue();
            if(range!=null&&range.matches("bytes=\\d*-\\d*")){
                ByteArrayOutputStream out=new ByteArrayOutputStream();byte[] buf=new byte[8192];int read;while((read=stream.read(buf))!=-1)out.write(buf,0,read);stream.close();byte[] data=out.toByteArray();
                String[] pair=range.substring(6).split("-",-1);int start=pair[0].isEmpty()?Math.max(0,data.length-Integer.parseInt(pair[1])):Integer.parseInt(pair[0]);int end=pair[0].isEmpty()||pair[1].isEmpty()?data.length-1:Math.min(data.length-1,Integer.parseInt(pair[1]));
                if(start<0||start>=data.length||end<start)return error(416,"Range Not Satisfiable");
                response.put("Content-Range","bytes "+start+"-"+end+"/"+data.length);response.put("Content-Length",String.valueOf(end-start+1));
                return new WebResourceResponse(mime,encoding,206,"Partial Content",response,new ByteArrayInputStream(data,start,end-start+1));
            }
            return new WebResourceResponse(mime,encoding,200,"OK",response,stream);
        }catch(Exception e){return error(404,"Not Found");}
    }
    private static String mime(String p){
        if(p.endsWith(".html"))return "text/html";if(p.endsWith(".js"))return "application/javascript";if(p.endsWith(".css"))return "text/css";
        if(p.endsWith(".svg"))return "image/svg+xml";if(p.endsWith(".webp"))return "image/webp";if(p.endsWith(".png"))return "image/png";if(p.endsWith(".jpg")||p.endsWith(".jpeg"))return "image/jpeg";
        if(p.endsWith(".mp3"))return "audio/mpeg";if(p.endsWith(".wav"))return "audio/wav";if(p.endsWith(".ogg"))return "audio/ogg";if(p.endsWith(".woff2"))return "font/woff2";if(p.endsWith(".json")||p.endsWith(".webmanifest"))return "application/json";return "application/octet-stream";
    }
    @Override public void onBackPressed(){if(web.canGoBack())web.goBack();else super.onBackPressed();}
    @Override protected void onSaveInstanceState(Bundle out){web.saveState(out);super.onSaveInstanceState(out);}
    @Override protected void onPause(){super.onPause();web.onPause();}
    @Override protected void onResume(){super.onResume();if(web!=null)web.onResume();}
    @Override protected void onDestroy(){if(web!=null){web.stopLoading();web.destroy();}super.onDestroy();}
}
