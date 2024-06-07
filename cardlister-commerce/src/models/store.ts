import { Entity, OneToMany } from 'typeorm';
import { Store as MedusaStore } from '@medusajs/medusa';
import { User } from './user';
import { Order } from './order';

@Entity()
export class Store extends MedusaStore {
  @OneToMany(() => User, (user) => user.store)
  members?: User[];
  @OneToMany(() => Order, (order) => order.store)
  orders?: Order[];
}