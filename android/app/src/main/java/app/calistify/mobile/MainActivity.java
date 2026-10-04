package app.calistify.mobile;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // CALISTIFY's local Health Connect plugin (permissions + workout writes).
        registerPlugin(CalistifyHealthPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
