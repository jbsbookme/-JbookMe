async function testAPI() {
  console.log('\n=== PROBANDO API DE SERVICIOS ===\n');
  
  // Test 1: Servicios FEMALE (debería incluir FEMALE + UNISEX)
  console.log('1. Servicios FEMALE:');
  const femaleRes = await fetch('http://localhost:3000/api/services?gender=FEMALE');
  const femaleData = await femaleRes.json();
  const femaleServices = femaleData.services || [];
  console.log(`   Total: ${femaleServices.length}`);
  console.log(`   FEMALE: ${femaleServices.filter((s: any) => s.gender === 'FEMALE').length}`);
  console.log(`   UNISEX: ${femaleServices.filter((s: any) => s.gender === 'UNISEX').length}`);
  
  // Test 2: Servicios MALE (debería incluir MALE + UNISEX)
  console.log('\n2. Servicios MALE:');
  const maleRes = await fetch('http://localhost:3000/api/services?gender=MALE');
  const maleData = await maleRes.json();
  const maleServices = maleData.services || [];
  console.log(`   Total: ${maleServices.length}`);
  console.log(`   MALE: ${maleServices.filter((s: any) => s.gender === 'MALE').length}`);
  console.log(`   UNISEX: ${maleServices.filter((s: any) => s.gender === 'UNISEX').length}`);
}

testAPI();
