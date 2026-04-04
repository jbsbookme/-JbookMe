import { getAdminFirestore } from './firebaseAdmin';

type ServicePayload = {
  id: string;
  name: string;
  price: number;
  duration: number;
  serviceFor: 'Men' | 'Women';
  active: boolean;
};

export const syncServiceToFirestore = async (service: ServicePayload) => {
  if (!service?.id) {
    throw new Error('Service id is required for Firestore sync.');
  }

  await getAdminFirestore()
    .collection('services')
    .doc(service.id)
    .set(
      {
        name: service.name,
        price: service.price,
        duration: service.duration,
        serviceFor: service.serviceFor,
        active: service.active,
      },
      { merge: true }
    );
};
