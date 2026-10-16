import { useState } from "react";
import { ActivityIndicator, Modal, Pressable, ScrollView, Switch, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";
import { authorizedRequest } from "@/src/features/auth/authApi";

export function FarmerInspectionModal({releaseId, onClose, onSaved}: {releaseId: string; onClose:()=>void; onSaved:()=>Promise<void>}) {
  const [sourceRef,setSourceRef]=useState("");
  const [inspectedAt,setInspectedAt]=useState("");
  const [brix,setBrix]=useState("");
  const [checks,setChecks]=useState({phiChecked:false,pestCheckPassed:false,qualityPassed:false});
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  return <Modal visible animationType="slide" onRequestClose={onClose}><SafeAreaView style={{flex:1,backgroundColor:"white"}}>
    <ScrollView contentContainerStyle={{padding:20,gap:18}}>
      <View style={{flexDirection:"row",justifyContent:"space-between",alignItems:"center"}}><Text style={{fontSize:20,fontWeight:"700"}}>Tự kiểm tra xuất xưởng</Text>
        <Pressable accessibilityLabel="Đóng" disabled={busy} onPress={onClose}><X size={22}/></Pressable></View>
      <Text>Mã phiếu / tham chiếu biên bản kiểm tra</Text><TextInput value={sourceRef} maxLength={500} onChangeText={setSourceRef} style={{borderWidth:1,borderColor:"#aaa",padding:12,borderRadius:4}}/>
      <Text>Thời điểm thực tế (ISO 8601, gồm múi giờ)</Text><TextInput value={inspectedAt} onChangeText={setInspectedAt} autoCapitalize="none" placeholder="YYYY-MM-DDTHH:mm:ss+07:00" style={{borderWidth:1,borderColor:"#aaa",padding:12,borderRadius:4}}/>
      <Text>Brix đo được (nếu có)</Text><TextInput value={brix} onChangeText={setBrix} keyboardType="decimal-pad" style={{borderWidth:1,borderColor:"#aaa",padding:12,borderRadius:4}}/>
      {([['phiChecked','Đã đối chiếu thời gian cách ly'],['pestCheckPassed','Kiểm tra sâu bệnh đạt'],['qualityPassed','Độ chín / chất lượng cơm đạt']] as const).map(([key,label])=>
        <View key={key} style={{flexDirection:"row",alignItems:"center",gap:12}}><Switch accessibilityLabel={label} value={checks[key]} onValueChange={value=>setChecks({...checks,[key]:value})}/><Text style={{flex:1}}>{label}</Text></View>)}
      {error ? <Text accessibilityRole="alert" style={{color:"#b91c1c"}}>{error}</Text>:null}
      <Pressable disabled={busy} style={{minHeight:44,borderRadius:4,backgroundColor:"#2E5A44",padding:12,flexDirection:"row",gap:10,justifyContent:"center"}} onPress={async()=>{
        setBusy(true);setError("");
        try {
          if (!sourceRef.trim() || !/[zZ]|[+-]\d{2}:\d{2}$/.test(inspectedAt) || !Number.isFinite(Date.parse(inspectedAt)) || (brix && (!Number.isFinite(Number(brix)) || Number(brix)<0 || Number(brix)>100))) throw new Error("Kiểm tra tham chiếu, thời gian và Brix.");
          await authorizedRequest({url:`/api/v1/export-releases/${encodeURIComponent(releaseId)}/inspect`,method:"POST",data:{sourceRef:sourceRef.trim(),inspectedAt:new Date(inspectedAt).toISOString(),...checks,...(brix?{measuredBrix:Number(brix)}:{})}});
          await onSaved();onClose();
        } catch(e) {setError(e instanceof Error?e.message:"Không thể lưu kiểm tra.");} finally {setBusy(false);}
      }}>{busy?<ActivityIndicator color="white"/>:<Check color="white" size={20}/>}<Text style={{color:"white",fontWeight:"700"}}>Ghi nhận kiểm tra</Text></Pressable>
    </ScrollView>
  </SafeAreaView></Modal>;
}
