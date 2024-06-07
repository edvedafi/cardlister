import { Column, Entity, Index, JoinColumn, ManyToOne } from 'typeorm';
import { Order as MedusaEntity } from '@medusajs/medusa';
import { Store } from './store';

@Entity()
export class Order extends MedusaEntity {
  @Index('UserStoreId')
  @Column({ nullable: true })
  store_id?: string;

  @ManyToOne(() => Store, (store) => store.orders)
  @JoinColumn({ name: 'store_id', referencedColumnName: 'id' })
  store?: Store;
}